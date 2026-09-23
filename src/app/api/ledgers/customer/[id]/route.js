import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(req, { params }) {
  const auth = await requirePermission("customers", "view");
  if (auth.response) return auth.response;
  const sales = await prisma.sale.findMany({ where: { customerId: params.id }, include: { items: { include: { product: true } } }, orderBy: { createdAt: "asc" } });
  let balance = 0;
  const rows = sales.map((s) => { const amount = Number(s.totalAmount); balance += amount; return { date: s.createdAt, reference: s.invoiceNo, description: `Sale ${s.status}`, debit: amount, credit: 0, balance, saleId: s.id }; });
  return NextResponse.json(rows.reverse());
}
