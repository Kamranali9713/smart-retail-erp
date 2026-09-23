import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const auth = await requirePermission("accounting", "view");
  if (auth.response) return auth.response;
  const txs = await prisma.transaction.findMany({ include: { account: true }, orderBy: { createdAt: "asc" }, take: 2000 });
  const balances = {};
  const rows = txs.map((t) => {
    const debit = t.type === "DEBIT" ? Number(t.amount) : 0;
    const credit = t.type === "CREDIT" ? Number(t.amount) : 0;
    const naturalCredit = ["LIABILITY", "EQUITY", "REVENUE"].includes(t.account.type);
    balances[t.accountId] = (balances[t.accountId] || 0) + (naturalCredit ? credit - debit : debit - credit);
    return { ...t, amount: Number(t.amount), debit, credit, balance: balances[t.accountId] };
  });
  return NextResponse.json(rows.reverse());
}
