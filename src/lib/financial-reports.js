import { prisma } from "@/lib/prisma";

const CREDIT_NORMAL = new Set(["LIABILITY", "EQUITY", "REVENUE"]);

function toNumber(value) {
  return Number(value || 0);
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function parseDateRange(searchParams) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = now;
  const fromValue = searchParams.get("from");
  const toValue = searchParams.get("to");

  const from = fromValue ? startOfDay(fromValue) : startOfDay(defaultFrom);
  const to = toValue ? endOfDay(toValue) : endOfDay(defaultTo);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid report date");
  }
  if (from > to) throw new Error("Report start date cannot be after end date");
  return { from, to };
}

async function loadAccountsAndTransactions({ from, to }) {
  const [accounts, transactions] = await Promise.all([
    prisma.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.transaction.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { account: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  return { accounts, transactions };
}

async function loadTransactionsThrough(date) {
  return prisma.transaction.findMany({
    where: { createdAt: { lte: date } },
    include: { account: true },
    orderBy: { createdAt: "asc" },
  });
}

function accountMovement(account, transactions) {
  let debit = 0;
  let credit = 0;
  for (const tx of transactions) {
    if (tx.accountId !== account.id) continue;
    const amount = toNumber(tx.amount);
    if (tx.type === "DEBIT") debit += amount;
    else credit += amount;
  }
  const balance = CREDIT_NORMAL.has(account.type) ? credit - debit : debit - credit;
  return { debit, credit, balance };
}

export async function getTrialBalance({ from, to }) {
  const { accounts, transactions } = await loadAccountsAndTransactions({ from, to });
  const rows = accounts.map((account) => {
    const movement = accountMovement(account, transactions);
    const debitBalance = movement.balance > 0 && !CREDIT_NORMAL.has(account.type) ? movement.balance : 0;
    const creditBalance = movement.balance > 0 && CREDIT_NORMAL.has(account.type) ? movement.balance : 0;
    return {
      id: account.id,
      name: account.name,
      type: account.type,
      debit: movement.debit,
      credit: movement.credit,
      balance: movement.balance,
      debitBalance,
      creditBalance,
    };
  });

  return {
    from,
    to,
    rows,
    totals: {
      debits: rows.reduce((s, r) => s + r.debitBalance, 0),
      credits: rows.reduce((s, r) => s + r.creditBalance, 0),
      transactionDebits: rows.reduce((s, r) => s + r.debit, 0),
      transactionCredits: rows.reduce((s, r) => s + r.credit, 0),
    },
  };
}

export async function getProfitAndLoss({ from, to }) {
  const { accounts, transactions } = await loadAccountsAndTransactions({ from, to });
  const rows = accounts.map((account) => ({ account, ...accountMovement(account, transactions) }));

  const revenueRows = rows.filter(({ account }) => account.type === "REVENUE");
  const expenseRows = rows.filter(({ account }) => account.type === "EXPENSE");
  const revenue = revenueRows.reduce((sum, row) => sum + row.balance, 0);
  const expenses = expenseRows.reduce((sum, row) => sum + row.balance, 0);

  return {
    from,
    to,
    revenueRows: revenueRows.map(({ account, balance }) => ({ id: account.id, name: account.name, amount: balance })),
    expenseRows: expenseRows.map(({ account, balance }) => ({ id: account.id, name: account.name, amount: balance })),
    totalRevenue: revenue,
    totalExpenses: expenses,
    netProfit: revenue - expenses,
  };
}

export async function getBalanceSheet({ from, to }) {
  const endTransactions = await loadTransactionsThrough(to);
  const accounts = await prisma.account.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  const rows = accounts.map((account) => ({ account, ...accountMovement(account, endTransactions) }));
  const pnl = await getProfitAndLoss({ from, to });

  const assets = rows.filter(({ account }) => account.type === "ASSET");
  const liabilities = rows.filter(({ account }) => account.type === "LIABILITY");
  const equityAccounts = rows.filter(({ account }) => account.type === "EQUITY");

  const assetTotal = assets.reduce((s, r) => s + r.balance, 0);
  const liabilityTotal = liabilities.reduce((s, r) => s + r.balance, 0);
  const equityTotal = equityAccounts.reduce((s, r) => s + r.balance, 0);
  const totalEquity = equityTotal + pnl.netProfit;

  return {
    from,
    to,
    assets: assets.map(({ account, balance }) => ({ id: account.id, name: account.name, amount: balance })),
    liabilities: liabilities.map(({ account, balance }) => ({ id: account.id, name: account.name, amount: balance })),
    equity: equityAccounts.map(({ account, balance }) => ({ id: account.id, name: account.name, amount: balance })),
    currentPeriodEarnings: pnl.netProfit,
    totals: {
      assets: assetTotal,
      liabilities: liabilityTotal,
      equity: totalEquity,
      liabilitiesAndEquity: liabilityTotal + totalEquity,
      difference: assetTotal - (liabilityTotal + totalEquity),
    },
  };
}

function classifyCashFlow(tx) {
  const ref = tx.refType || "MANUAL";
  if (["SALE", "INCOME"].includes(ref)) return "operating";
  if (["PURCHASE", "EXPENSE", "VENDOR_PAYMENT", "SALE_RETURN"].includes(ref)) return "operating";
  if (ref === "MANUAL") return "financing";
  return "operating";
}

export async function getCashFlow({ from, to }) {
  const [accounts, periodTransactions, beforeTransactions] = await Promise.all([
    prisma.account.findMany({ where: { name: { in: ["Cash", "Bank"] } } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: from, lte: to } }, include: { account: true }, orderBy: { createdAt: "asc" } }),
    prisma.transaction.findMany({ where: { createdAt: { lt: from } }, include: { account: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const cashAccountIds = new Set(accounts.map((a) => a.id));
  const signed = (tx) => tx.type === "DEBIT" ? toNumber(tx.amount) : -toNumber(tx.amount);
  const opening = beforeTransactions.filter((tx) => cashAccountIds.has(tx.accountId)).reduce((s, tx) => s + signed(tx), 0);
  const groups = { operating: [], investing: [], financing: [] };

  for (const tx of periodTransactions) {
    if (!cashAccountIds.has(tx.accountId)) continue;
    const amount = signed(tx);
    const category = classifyCashFlow(tx);
    groups[category].push({
      id: tx.id,
      date: tx.createdAt,
      account: tx.account.name,
      description: tx.description || tx.refType || "Transaction",
      refType: tx.refType,
      refId: tx.refId,
      amount,
    });
  }

  const total = (items) => items.reduce((s, x) => s + x.amount, 0);
  const operating = total(groups.operating);
  const investing = total(groups.investing);
  const financing = total(groups.financing);
  const netChange = operating + investing + financing;

  return {
    from,
    to,
    openingCash: opening,
    operating: { items: groups.operating, total: operating },
    investing: { items: groups.investing, total: investing },
    financing: { items: groups.financing, total: financing },
    netChange,
    closingCash: opening + netChange,
  };
}
