import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { postSaleAccounting } from "@/lib/accounting";

export async function POST(req, { params }) {
  const auth = await requirePermission("pos", "edit");
  if (auth.response) return auth.response;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: params.id },
        include: { items: { include: { product: true } }, customer: true },
      });

      if (!sale || sale.status !== "HELD") {
        throw new Error("Sale not found or not held");
      }

      let costOfGoods = 0;
      for (const item of sale.items) {
        const stock = await tx.stock.findUnique({ where: { productId: item.productId } });
        if (!stock || Number(stock.quantity) < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product.name}`);
        }
        costOfGoods += Number(item.product.costPrice || 0) * item.quantity;
      }

      for (const item of sale.items) {
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

      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: { status: "COMPLETED" },
        include: { items: { include: { product: true } }, customer: true },
      });

      await postSaleAccounting(tx, { ...updated, costOfGoods });

      await tx.auditLog.create({
        data: {
          userId: auth.session.user.id,
          action: "RESUME_SALE",
          module: "pos",
          entityId: sale.id,
          metadata: { invoiceNo: sale.invoiceNo },
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unable to resume sale" }, { status: 400 });
  }
}
