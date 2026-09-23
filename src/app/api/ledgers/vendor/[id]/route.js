import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(req, { params }) {
  const auth = await requirePermission("vendors", "view");
  if (auth.response) return auth.response;

  const vendor = await prisma.vendor.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({ where: { vendorId: params.id, status: "RECEIVED" }, orderBy: { createdAt: "asc" } }),
    prisma.vendorPayment.findMany({ where: { vendorId: params.id }, orderBy: { createdAt: "asc" } }),
  ]);

  const entries = [
    ...purchases.map((p) => ({ date: p.createdAt, reference: p.invoiceNo, description: `Purchase ${p.status}`, debit: 0, credit: Number(p.totalAmount), type: "PURCHASE", purchaseId: p.id })),
    ...payments.map((p) => ({ date: p.createdAt, reference: `PAY-${p.id.slice(-8)}`, description: `Payment ${p.method}${p.note ? ` — ${p.note}` : ""}`, debit: Number(p.amount), credit: 0, type: "PAYMENT", paymentId: p.id })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = 0;
  const rows = entries.map((entry) => {
    balance += Number(entry.credit) - Number(entry.debit);
    return { ...entry, balance };
  });

  return NextResponse.json({
    vendor,
    rows: rows.reverse(),
    summary: {
      purchases: rows.reduce((sum, x) => sum + Number(x.credit), 0),
      paid: rows.reduce((sum, x) => sum + Number(x.debit), 0),
      outstanding: Math.max(0, balance),
    },
  });
}
