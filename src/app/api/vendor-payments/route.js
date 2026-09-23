import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { postVendorPaymentAccounting, getVendorOutstanding } from "@/lib/accounting";

export async function POST(req) {
  const auth = await requirePermission("vendors", "create");
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const method = ["CASH", "CARD", "BANK_TRANSFER"].includes(body.method) ? body.method : "CASH";
    if (!body.vendorId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Vendor and a positive payment amount are required" }, { status: 422 });
    }
    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findUnique({ where: { id: body.vendorId }, select: { id: true, name: true } });
      if (!vendor) throw new Error("Vendor not found");
      const outstanding = await getVendorOutstanding(tx, vendor.id);
      if (amount > outstanding + 0.009) throw new Error(`Payment exceeds vendor outstanding balance of ${outstanding.toFixed(2)}`);
      const payment = await tx.vendorPayment.create({ data: { vendorId: body.vendorId, amount, method, note: body.note || null } });
      await postVendorPaymentAccounting(tx, payment);
      await tx.auditLog.create({ data: { userId: auth.session.user.id, action: "CREATE", module: "vendors", entityId: payment.id, metadata: { type: "VENDOR_PAYMENT", vendorId: vendor.id, amount, method } } });
      return payment;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to record vendor payment" }, { status: 400 });
  }
}
