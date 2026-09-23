import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(req, { params }) {
  const auth = await requirePermission("vendors", "view");
  if (auth.response) return auth.response;
  const [purchases, payments] = await Promise.all([
    prisma.purchase.findMany({ where: { vendorId: params.id }, orderBy: { createdAt: "asc" } }),
    prisma.vendorPayment.findMany({ where: { vendorId: params.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const entries = [...purchases.map((p) => ({ date: p.createdAt, reference: p.invoiceNo, description: `Purchase ${p.status}`, debit: 0, credit: Number(p.totalAmount) })), ...payments.map((p) => ({ date: p.createdAt, reference: p.id.slice(-8), description: `Payment ${p.method}`, debit: Number(p.amount), credit: 0 }))].sort((a,b) => new Date(a.date)-new Date(b.date));
  let balance = 0;
  const rows = entries.map((e) => { balance += e.credit - e.debit; return { ...e, balance }; });
  return NextResponse.json(rows.reverse());
}
