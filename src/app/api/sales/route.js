import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoiceNo } from "@/lib/utils";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { postSaleAccounting } from "@/lib/accounting";

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one product is required");
  }

  const merged = new Map();
  for (const item of items) {
    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Each sale item requires a valid product and whole-number quantity");
    }
    merged.set(productId, (merged.get(productId) || 0) + quantity);
  }

  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "pos", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { invoiceNo: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  try {
    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: true } },
        customer: true,
        user: true,
        returns: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(sales);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Unable to load sales" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "pos", "create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const status = body.status === "HELD" ? "HELD" : "COMPLETED";
    const items = normalizeItems(body.items);
    const customerId = body.customerId || null;
    const paymentMethod = ["CASH", "CARD", "BANK_TRANSFER"].includes(body.paymentMethod)
      ? body.paymentMethod
      : "CASH";

    const result = await prisma.$transaction(async (tx) => {
      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        if (!customer) throw new Error("Customer not found");
      }

      const products = await tx.product.findMany({
        where: { id: { in: items.map((item) => item.productId) }, isActive: true },
        include: { stock: true },
      });

      if (products.length !== items.length) {
        throw new Error("One or more selected products are unavailable");
      }

      const productMap = new Map(products.map((product) => [product.id, product]));
      let subtotal = 0;
      let taxAmount = 0;
      let costOfGoods = 0;

      const saleItems = items.map((item) => {
        const product = productMap.get(item.productId);
        const unitPrice = money(product.sellingPrice);
        const lineSubtotal = money(unitPrice * item.quantity);
        const lineTax = money((Number(product.taxRate || 0) / 100) * lineSubtotal);

        subtotal += lineSubtotal;
        taxAmount += lineTax;
        costOfGoods += money(product.costPrice) * item.quantity;

        if (status === "COMPLETED" && (!product.stock || Number(product.stock.quantity) < item.quantity)) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          total: lineSubtotal,
        };
      });

      subtotal = money(subtotal);
      taxAmount = money(taxAmount);
      costOfGoods = money(costOfGoods);

      const requestedDiscountAmount = Math.max(0, money(body.discountAmount));
      const requestedDiscountPct = Math.max(0, Number(body.discountPct || 0));
      const calculatedDiscount = requestedDiscountAmount > 0
        ? requestedDiscountAmount
        : money((subtotal * Math.min(requestedDiscountPct, 100)) / 100);
      const discountAmount = money(Math.min(calculatedDiscount, subtotal));
      const discountPct = subtotal > 0 ? money((discountAmount / subtotal) * 100) : 0;
      const totalAmount = money(Math.max(0, subtotal - discountAmount + taxAmount));

      const sale = await tx.sale.create({
        data: {
          invoiceNo: generateInvoiceNo("INV"),
          customerId,
          userId: session.user.id,
          subtotal,
          discountAmount,
          discountPct,
          taxAmount,
          totalAmount,
          paymentMethod,
          status,
          items: { create: saleItems },
        },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (status === "COMPLETED") {
        for (const item of saleItems) {
          await tx.stock.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } },
          });
          await tx.inventoryLog.create({
            data: {
              productId: item.productId,
              action: "SALE",
              quantity: item.quantity,
              refId: sale.id,
              reason: `POS sale ${sale.invoiceNo}`,
            },
          });
        }

        await postSaleAccounting(tx, { ...sale, costOfGoods });

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "SALE",
            module: "pos",
            entityId: sale.id,
            metadata: { invoiceNo: sale.invoiceNo, totalAmount, paymentMethod },
          },
        });
      } else {
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "HOLD_SALE",
            module: "pos",
            entityId: sale.id,
            metadata: { invoiceNo: sale.invoiceNo, totalAmount },
          },
        });
      }

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unable to create sale" }, { status: 400 });
  }
}
