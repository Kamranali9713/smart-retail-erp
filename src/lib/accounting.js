import { prisma } from "@/lib/prisma";

const CREDIT_NORMAL_TYPES = ["LIABILITY", "EQUITY", "REVENUE"];

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function getOrCreateAccount(tx, name, type) {
  return tx.account.upsert({
    where: { name },
    update: {},
    create: { name, type },
  });
}

function inferAccountType(name) {
  if (["Sales Revenue", "Other Income"].includes(name)) return "REVENUE";
  if (name === "Sales Tax Payable") return "LIABILITY";
  if (name.includes("Expense") || name === "Cost of Goods Sold") return "EXPENSE";
  if (name === "Accounts Payable" || name === "Customer Refund Payable") return "LIABILITY";
  if (name === "Owner Equity" || name.includes("Retained Earnings")) return "EQUITY";
  return "ASSET";
}

async function resolveAccount(tx, account) {
  if (account && typeof account === "object" && account.id) return account;
  if (typeof account !== "string" || !account.trim()) throw new Error("Account is required");

  const byId = await tx.account.findUnique({ where: { id: account } });
  if (byId) return byId;
  return getOrCreateAccount(tx, account, inferAccountType(account));
}

/**
 * Returns true when at least one ledger row has already been posted for a
 * business document. All automatic posting functions use this guard so a
 * browser retry, webhook retry, or reconciliation run cannot duplicate a
 * document's accounting entries.
 */
export async function hasPostedReference(tx, refType, refId) {
  if (!refType || !refId) return false;
  const row = await tx.transaction.findFirst({
    where: { refType, refId },
    select: { id: true },
  });
  return Boolean(row);
}

export async function postTransaction(tx, { account, accountId, type, amount, description, refType, refId }) {
  const value = money(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error("Transaction amount must be a valid non-negative number");
  if (!value) return null;
  if (!["DEBIT", "CREDIT"].includes(type)) throw new Error("Transaction type must be DEBIT or CREDIT");

  const acct = await resolveAccount(tx, accountId || account);
  const naturalCredit = CREDIT_NORMAL_TYPES.includes(acct.type);
  const delta = naturalCredit
    ? (type === "CREDIT" ? value : -value)
    : (type === "DEBIT" ? value : -value);

  await tx.account.update({
    where: { id: acct.id },
    data: { balance: { increment: delta } },
  });

  return tx.transaction.create({
    data: {
      accountId: acct.id,
      type,
      amount: value,
      description: description || null,
      refType: refType || null,
      refId: refId || null,
    },
  });
}

export async function postSaleAccounting(tx, sale) {
  if (await hasPostedReference(tx, "SALE", sale.id)) return { posted: false, reason: "already-posted" };

  const cashAccount = sale.paymentMethod === "BANK_TRANSFER" || sale.paymentMethod === "CARD" ? "Bank" : "Cash";
  const total = money(sale.totalAmount);
  const tax = money(sale.taxAmount);
  const netRevenue = money(Math.max(0, total - tax));

  await postTransaction(tx, {
    account: cashAccount,
    type: "DEBIT",
    amount: total,
    description: `Sale ${sale.invoiceNo}`,
    refType: "SALE",
    refId: sale.id,
  });

  await postTransaction(tx, {
    account: "Sales Revenue",
    type: "CREDIT",
    amount: netRevenue,
    description: `Sale revenue ${sale.invoiceNo}`,
    refType: "SALE",
    refId: sale.id,
  });

  if (tax > 0) {
    await postTransaction(tx, {
      account: "Sales Tax Payable",
      type: "CREDIT",
      amount: tax,
      description: `Sales tax ${sale.invoiceNo}`,
      refType: "SALE",
      refId: sale.id,
    });
  }

  const cost = money(sale.costOfGoods);
  if (cost > 0) {
    await postTransaction(tx, {
      account: "Cost of Goods Sold",
      type: "DEBIT",
      amount: cost,
      description: `COGS ${sale.invoiceNo}`,
      refType: "SALE",
      refId: sale.id,
    });
    await postTransaction(tx, {
      account: "Inventory",
      type: "CREDIT",
      amount: cost,
      description: `Inventory consumed ${sale.invoiceNo}`,
      refType: "SALE",
      refId: sale.id,
    });
  }

  return { posted: true };
}

export async function getSaleCostOfGoods(tx, sale) {
  const existing = await tx.transaction.aggregate({
    _sum: { amount: true },
    where: {
      refType: "SALE",
      refId: sale.id,
      description: { startsWith: "COGS " },
      type: "DEBIT",
    },
  });

  if (existing._sum.amount) return money(existing._sum.amount);

  const items = sale.items || await tx.saleItem.findMany({ where: { saleId: sale.id } });
  let total = 0;
  for (const item of items) {
    const product = item.product || await tx.product.findUnique({ where: { id: item.productId } });
    total += money(product?.costPrice) * Number(item.quantity || 0);
  }
  return money(total);
}

export async function postSaleReturnAccounting(tx, { sale, returnRecord, costOfGoods }) {
  if (await hasPostedReference(tx, "SALE_RETURN", returnRecord.id)) return { posted: false, reason: "already-posted" };

  const cashAccount = sale.paymentMethod === "BANK_TRANSFER" || sale.paymentMethod === "CARD" ? "Bank" : "Cash";
  const amount = money(returnRecord.amount);
  if (amount <= 0) throw new Error("Return amount must be greater than zero");

  await postTransaction(tx, {
    account: "Sales Revenue",
    type: "DEBIT",
    amount: money(Math.min(amount, Math.max(0, amount - money(sale.taxAmount)))),
    description: `Sales return ${sale.invoiceNo}`,
    refType: "SALE_RETURN",
    refId: returnRecord.id,
  });

  const taxPortion = money(Math.min(money(sale.taxAmount), amount));
  if (taxPortion > 0) {
    await postTransaction(tx, {
      account: "Sales Tax Payable",
      type: "DEBIT",
      amount: taxPortion,
      description: `Sales tax reversal ${sale.invoiceNo}`,
      refType: "SALE_RETURN",
      refId: returnRecord.id,
    });
  }

  await postTransaction(tx, {
    account: cashAccount,
    type: "CREDIT",
    amount,
    description: `Refund ${sale.invoiceNo}`,
    refType: "SALE_RETURN",
    refId: returnRecord.id,
  });

  const cost = money(costOfGoods);
  if (cost > 0) {
    await postTransaction(tx, {
      account: "Inventory",
      type: "DEBIT",
      amount: cost,
      description: `Inventory returned ${sale.invoiceNo}`,
      refType: "SALE_RETURN",
      refId: returnRecord.id,
    });
    await postTransaction(tx, {
      account: "Cost of Goods Sold",
      type: "CREDIT",
      amount: cost,
      description: `COGS reversed ${sale.invoiceNo}`,
      refType: "SALE_RETURN",
      refId: returnRecord.id,
    });
  }

  return { posted: true };
}

export async function postPurchaseAccounting(tx, purchase, paymentMethod = "CREDIT") {
  if (await hasPostedReference(tx, "PURCHASE", purchase.id)) return { posted: false, reason: "already-posted" };

  const total = money(purchase.totalAmount);
  const paid = Math.min(total, money(purchase.paidAmount));
  const due = money(total - paid);

  await postTransaction(tx, {
    account: "Inventory",
    type: "DEBIT",
    amount: total,
    description: `Purchase ${purchase.invoiceNo}`,
    refType: "PURCHASE",
    refId: purchase.id,
  });

  if (paid > 0) {
    const account = paymentMethod === "BANK_TRANSFER" || paymentMethod === "CARD" ? "Bank" : "Cash";
    await postTransaction(tx, {
      account,
      type: "CREDIT",
      amount: paid,
      description: `Purchase payment ${purchase.invoiceNo}`,
      refType: "PURCHASE",
      refId: purchase.id,
    });
  }

  if (due > 0) {
    await postTransaction(tx, {
      account: "Accounts Payable",
      type: "CREDIT",
      amount: due,
      description: `Payable ${purchase.invoiceNo}`,
      refType: "PURCHASE",
      refId: purchase.id,
    });
  }

  return { posted: true };
}

export async function postPurchaseReturnAccounting(tx, { purchase, returnId, refundMethod = "CREDIT" }) {
  if (await hasPostedReference(tx, "PURCHASE_RETURN", returnId)) return { posted: false, reason: "already-posted" };

  const total = money(purchase.totalAmount);
  const paid = Math.min(total, money(purchase.paidAmount));
  const due = money(total - paid);

  await postTransaction(tx, {
    account: "Inventory",
    type: "CREDIT",
    amount: total,
    description: `Purchase return ${purchase.invoiceNo}`,
    refType: "PURCHASE_RETURN",
    refId: returnId,
  });

  if (due > 0) {
    await postTransaction(tx, {
      account: "Accounts Payable",
      type: "DEBIT",
      amount: due,
      description: `Payable reversed ${purchase.invoiceNo}`,
      refType: "PURCHASE_RETURN",
      refId: returnId,
    });
  }

  if (paid > 0) {
    const account = refundMethod === "BANK_TRANSFER" || refundMethod === "CARD" ? "Bank" : "Cash";
    await postTransaction(tx, {
      account,
      type: "DEBIT",
      amount: paid,
      description: `Purchase refund ${purchase.invoiceNo}`,
      refType: "PURCHASE_RETURN",
      refId: returnId,
    });
  }

  return { posted: true };
}

export async function postVendorPaymentAccounting(tx, payment) {
  if (await hasPostedReference(tx, "VENDOR_PAYMENT", payment.id)) return { posted: false, reason: "already-posted" };
  const amount = money(payment.amount);
  if (amount <= 0) throw new Error("Vendor payment amount must be greater than zero");
  const account = payment.method === "BANK_TRANSFER" || payment.method === "CARD" ? "Bank" : "Cash";

  await postTransaction(tx, {
    account: "Accounts Payable",
    type: "DEBIT",
    amount,
    description: `Vendor payment ${payment.id}`,
    refType: "VENDOR_PAYMENT",
    refId: payment.id,
  });
  await postTransaction(tx, {
    account,
    type: "CREDIT",
    amount,
    description: `Vendor payment ${payment.id}`,
    refType: "VENDOR_PAYMENT",
    refId: payment.id,
  });
  return { posted: true };
}

export async function postJournalEntry(tx, { entries, description, refType = "MANUAL", refId = null }) {
  if (!Array.isArray(entries) || entries.length < 2) throw new Error("A journal entry requires at least two lines");
  const normalized = entries.map((entry) => ({
    accountId: entry.accountId,
    type: entry.type,
    amount: money(entry.amount),
  }));
  if (normalized.some((entry) => !entry.accountId || !["DEBIT", "CREDIT"].includes(entry.type) || !Number.isFinite(entry.amount) || entry.amount <= 0)) {
    throw new Error("Every journal line requires an account, DEBIT/CREDIT type, and positive amount");
  }
  const debits = money(normalized.filter((entry) => entry.type === "DEBIT").reduce((sum, entry) => sum + entry.amount, 0));
  const credits = money(normalized.filter((entry) => entry.type === "CREDIT").reduce((sum, entry) => sum + entry.amount, 0));
  if (Math.abs(debits - credits) > 0.005) throw new Error("Journal entry is not balanced: total debits must equal total credits");
  return Promise.all(normalized.map((entry) => postTransaction(tx, {
    accountId: entry.accountId,
    type: entry.type,
    amount: entry.amount,
    description,
    refType,
    refId,
  })));
}
