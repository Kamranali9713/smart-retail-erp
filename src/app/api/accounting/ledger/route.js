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

function normalBalance(type, debit, credit) {
  const amount = debit - credit;
  return ["LIABILITY", "EQUITY", "REVENUE"].includes(type) ? -amount : amount;
}

function serializeTransaction(row) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    accountId: row.accountId,
    account: row.account ? { id: row.account.id, name: row.account.name, type: row.account.type } : null,
    type: row.type,
    amount: Number(row.amount),
    description: row.description,
    refType: row.refType,
    refId: row.refId,
  };
}

export async function GET(req) {
  const auth = await requirePermission("accounting", "view");
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || "";
    const refType = searchParams.get("refType") || "";
    const search = searchParams.get("search")?.trim() || "";
    const from = startOfDay(searchParams.get("from"));
    const to = endOfDay(searchParams.get("to"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 500), 1), 1000);

    const where = {
      ...(accountId ? { accountId } : {}),
      ...(refType ? { refType } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      ...(search ? { OR: [{ description: { contains: search, mode: "insensitive" } }, { refId: { contains: search, mode: "insensitive" } }, { account: { name: { contains: search, mode: "insensitive" } } }] } : {}),
    };

    const beforeWhere = {
      ...(accountId ? { accountId } : {}),
      ...(from ? { createdAt: { lt: from } } : {}),
    };

    const periodWhere = {
      ...(accountId ? { accountId } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const [transactions, accounts, openingRows, balanceRows, periodRows, filteredCount] = await Promise.all([
      prisma.transaction.findMany({ where, include: { account: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: limit }),
      prisma.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.transaction.findMany({ where: beforeWhere, select: { accountId: true, type: true, amount: true } }),
      prisma.transaction.findMany({ where: periodWhere, include: { account: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      prisma.transaction.findMany({ where: periodWhere, select: { accountId: true, type: true, amount: true } }),
      prisma.transaction.count({ where }),
    ]);

    const openingByAccount = {};
    for (const row of openingRows) {
      const current = openingByAccount[row.accountId] || { debit: 0, credit: 0 };
      const amount = Number(row.amount);
      if (row.type === "DEBIT") current.debit += amount;
      else current.credit += amount;
      openingByAccount[row.accountId] = current;
    }

    const running = {};
    for (const account of accounts) {
      const opening = openingByAccount[account.id] || { debit: 0, credit: 0 };
      running[account.id] = normalBalance(account.type, opening.debit, opening.credit);
    }

    const balanceAtTransaction = new Map();
    for (const transaction of balanceRows) {
      const amount = Number(transaction.amount);
      const debit = transaction.type === "DEBIT" ? amount : 0;
      const credit = transaction.type === "CREDIT" ? amount : 0;
      running[transaction.accountId] = (running[transaction.accountId] || 0) + normalBalance(transaction.account.type, debit, credit);
      balanceAtTransaction.set(transaction.id, running[transaction.accountId]);
    }

    const rows = transactions.map((transaction) => {
      const amount = Number(transaction.amount);
      const debit = transaction.type === "DEBIT" ? amount : 0;
      const credit = transaction.type === "CREDIT" ? amount : 0;
      return { ...serializeTransaction(transaction), debit, credit, balance: balanceAtTransaction.get(transaction.id) ?? running[transaction.accountId] ?? 0 };
    });

    const totals = rows.reduce((sum, row) => ({
      debit: sum.debit + row.debit,
      credit: sum.credit + row.credit,
    }), { debit: 0, credit: 0 });

    const openingBalance = accountId
      ? (running[accountId] || 0) - rows.filter((row) => row.accountId === accountId).reduce((sum, row) => sum + normalBalance(row.account.type, row.debit, row.credit), 0)
      : null;

    const accountSummaries = accounts.map((account) => {
      const opening = openingByAccount[account.id] || { debit: 0, credit: 0 };
      const periodAccountRows = periodRows.filter((row) => row.accountId === account.id);
      const debit = periodAccountRows.filter((row) => row.type === "DEBIT").reduce((sum, row) => sum + Number(row.amount), 0);
      const credit = periodAccountRows.filter((row) => row.type === "CREDIT").reduce((sum, row) => sum + Number(row.amount), 0);
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        openingBalance: normalBalance(account.type, opening.debit, opening.credit),
        debit,
        credit,
        closingBalance: normalBalance(account.type, opening.debit + debit, opening.credit + credit),
      };
    }).filter((row) => row.debit || row.credit || row.openingBalance);

    return NextResponse.json({
      rows,
      accounts,
      accountSummaries,
      totals,
      openingBalance,
      closingBalance: accountId ? (running[accountId] || 0) : null,
      count: filteredCount,
      limit,
      hasMore: filteredCount > rows.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load accounting ledger" }, { status: 400 });
  }
}
