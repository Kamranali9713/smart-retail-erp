import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function startOfDay(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
function endOfDay(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(req) {
  const auth = await requirePermission("accounting", "view");
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const from = startOfDay(searchParams.get("from"));
    const to = endOfDay(searchParams.get("to"));
    const where = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
    const [accounts, transactions] = await Promise.all([
      prisma.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.transaction.findMany({ where, select: { accountId: true, type: true, amount: true } }),
    ]);
    const totalsByAccount = {};
    for (const transaction of transactions) {
      const current = totalsByAccount[transaction.accountId] || { debit: 0, credit: 0 };
      const amount = Number(transaction.amount);
      if (transaction.type === "DEBIT") current.debit += amount;
      if (transaction.type === "CREDIT") current.credit += amount;
      totalsByAccount[transaction.accountId] = current;
    }
    const rows = accounts.map((account) => {
      const totals = totalsByAccount[account.id] || { debit: 0, credit: 0 };
      const debit = Number(totals.debit.toFixed(2));
      const credit = Number(totals.credit.toFixed(2));
      return { id: account.id, name: account.name, type: account.type, debit, credit, balance: Number((debit - credit).toFixed(2)) };
    }).filter((row) => row.debit || row.credit);
    const totalDebit = Number(rows.reduce((sum, row) => sum + row.debit, 0).toFixed(2));
    const totalCredit = Number(rows.reduce((sum, row) => sum + row.credit, 0).toFixed(2));
    return NextResponse.json({ rows, totals: { debit: totalDebit, credit: totalCredit }, balanced: Math.abs(totalDebit - totalCredit) <= 0.01, difference: Number((totalDebit - totalCredit).toFixed(2)), from: searchParams.get("from") || null, to: searchParams.get("to") || null });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load trial balance" }, { status: 400 });
  }
}
