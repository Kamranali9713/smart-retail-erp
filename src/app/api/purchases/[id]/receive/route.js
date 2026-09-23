import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { postPurchaseAccounting } from "@/lib/accounting";

export async function POST(req, { params }) {
  const auth = await requirePermission("purchases", "edit");
  if (auth.response) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const paymentMethod = ["CASH", "CARD", "BANK_TRANSFER", "CREDIT"].includes(body.paymentMethod) ? body.paymentMethod : "CREDIT";
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({ where: { id: params.id }, include: { items: true } });
      if (!purchase) throw new Error("Purchase not found");
      if (purchase.status === "RECEIVED") throw new Error("Purchase is already received");
      for (const item of purchase.items) {
        await tx.stock.upsert({ where: { productId: item.productId }, update: { quantity: { increment: item.quantity } }, create: { productId: item.productId, quantity: item.quantity } });
        await tx.inventoryLog.create({ data: { productId: item.productId, action: "PURCHASE", quantity: item.quantity, refId: purchase.id, reason: `Purchase ${purchase.invoiceNo}` } });
      }
      const updated = await tx.purchase.update({ where: { id: purchase.id }, data: { status: "RECEIVED" } });
      await postPurchaseAccounting(tx, updated, paymentMethod);
      await tx.auditLog.create({ data: { userId: auth.session.user.id, action: "PURCHASE", module: "purchases", entityId: purchase.id, metadata: { status: "RECEIVED" } } });
      return updated;
    });
    return NextResponse.json(result);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 400 }); }
}
