import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNo } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { postSaleAccounting } from "@/lib/accounting";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sales = await prisma.sale.findMany({
    where: status ? { status } : {},
    include: { items: { include: { product: true } }, customer: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(sales);
}

// body: { items: [{productId, quantity, unitPrice}], discountAmount, discountPct, paymentMethod, customerId, status ('COMPLETED'|'HELD') }
export async function POST(req) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const subtotal = body.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);

      let taxAmount = 0;
      for (const i of body.items) {
        const product = await tx.product.findUnique({ where: { id: i.productId } });
        taxAmount += (Number(product?.taxRate || 0) / 100) * i.quantity * i.unitPrice;
      }

      const discountAmount = body.discountAmount || (subtotal * (body.discountPct || 0)) / 100;
      const totalAmount = subtotal - discountAmount + taxAmount;

      let costOfGoods = 0;
      for (const i of body.items) {
        const product = await tx.product.findUnique({ where: { id: i.productId } });
        costOfGoods += Number(product?.costPrice || 0) * Number(i.quantity);
      }

      const sale = await tx.sale.create({
        data: {
          invoiceNo: generateInvoiceNo("INV"),
          customerId: body.customerId || null,
          userId: session?.user?.id,
          subtotal,
          discountAmount,
          discountPct: body.discountPct || 0,
          taxAmount,
          totalAmount,
          paymentMethod: body.paymentMethod || "CASH",
          status: body.status || "COMPLETED",
          items: {
            create: body.items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              total: i.quantity * i.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      // Deduct stock only for completed sales
      if ((body.status || "COMPLETED") === "COMPLETED") {
        for (const i of body.items) {
          const stock = await tx.stock.findUnique({ where: { productId: i.productId } });
          if (!stock || stock.quantity < i.quantity) {
            throw new Error(`Insufficient stock for product ${i.productId}`);
          }
          await tx.stock.update({
            where: { productId: i.productId },
            data: { quantity: stock.quantity - i.quantity },
          });
          await tx.inventoryLog.create({
            data: {
              productId: i.productId,
              action: "SALE",
              quantity: i.quantity,
              refId: sale.id,
            },
          });
        }

        await postSaleAccounting(tx, { ...sale, costOfGoods });

        if (session?.user?.id) {
          await tx.auditLog.create({
            data: { userId: session.user.id, action: "SALE", module: "pos", entityId: sale.id },
          });
        }
      }

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
