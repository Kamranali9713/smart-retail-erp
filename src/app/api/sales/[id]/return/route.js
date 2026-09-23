import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { getSaleCostOfGoods, postSaleReturnAccounting } from "@/lib/accounting";

export async function POST(req, { params }) {
  const auth = await requirePermission("pos", "edit");
  if (auth.response) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: params.id },
        include: { items: { include: { product: true } }, returns: true },
      });

      if (!sale) throw new Error("Sale not found");
      if (sale.status !== "COMPLETED") throw new Error("Only completed sales can be returned");
      if (sale.returns.length > 0) throw new Error("This sale has already been returned");

      const requestedAmount = Number(body.amount ?? sale.totalAmount);
      const amount = Math.round(requestedAmount * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Return amount must be greater than zero");
      if (amount > Number(sale.totalAmount)) throw new Error("Return amount cannot exceed the sale total");

      // Phase 6 supports a full-item return. A partial monetary return is rejected
      // until item-level return quantities are implemented in a future phase.
      if (Math.abs(amount - Number(sale.totalAmount)) > 0.005) {
        throw new Error("Partial returns are not supported yet. Return the complete sale.");
      }

      for (const item of sale.items) {
        await tx.stock.upsert({
          where: { productId: item.productId },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, quantity: item.quantity },
        });
        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: "RETURN",
            quantity: item.quantity,
            refId: sale.id,
            reason: `Sales return ${sale.invoiceNo}`,
          },
        });
      }

      const returnRecord = await tx.return.create({
        data: {
          saleId: sale.id,
          amount,
          reason: body.reason?.trim() || null,
        },
      });

      const costOfGoods = await getSaleCostOfGoods(tx, sale);

      await postSaleReturnAccounting(tx, {
        sale,
        returnRecord,
        costOfGoods,
      });

      const updated = await tx.sale.update({
        where: { id: sale.id },
        data: { status: "RETURNED" },
        include: { items: { include: { product: true } }, customer: true, returns: true },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.session.user.id,
          action: "SALE_RETURN",
          module: "pos",
          entityId: sale.id,
          metadata: { invoiceNo: sale.invoiceNo, amount, reason: returnRecord.reason },
        },
      });

      return updated;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Unable to return sale" }, { status: 400 });
  }
}
