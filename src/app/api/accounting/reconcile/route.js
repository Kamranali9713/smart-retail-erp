import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getSaleCostOfGoods, hasPostedReference, postPurchaseAccounting, postSaleAccounting, postSaleReturnAccounting, postTransaction, postVendorPaymentAccounting } from "@/lib/accounting";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = await requirePermission("accounting", "create");
  if (auth.response) return auth.response;
  try {
    const body = await req.json().catch(() => ({}));
    const repair = body.repair !== false;
    const summary = { sales: { scanned: 0, posted: 0 }, returns: { scanned: 0, posted: 0 }, purchases: { scanned: 0, posted: 0 }, vendorPayments: { scanned: 0, posted: 0 }, income: { scanned: 0, posted: 0 }, expenses: { scanned: 0, posted: 0 } };
    const result = await prisma.$transaction(async (tx) => {
      const sales = await tx.sale.findMany({ where: { status: { in: ["COMPLETED", "RETURNED", "REFUNDED"] } }, include: { items: { include: { product: true } } }, orderBy: { createdAt: "asc" } });
      for (const sale of sales) {
        summary.sales.scanned += 1;
        if (sale.status === "COMPLETED" && !(await hasPostedReference(tx, "SALE", sale.id)) && repair) {
          await postSaleAccounting(tx, { ...sale, costOfGoods: await getSaleCostOfGoods(tx, sale) });
          summary.sales.posted += 1;
        }
        const returns = await tx.return.findMany({ where: { saleId: sale.id }, orderBy: { createdAt: "asc" } });
        for (const returnRecord of returns) {
          summary.returns.scanned += 1;
          if (!(await hasPostedReference(tx, "SALE_RETURN", returnRecord.id)) && repair) {
            const originalCost = await getSaleCostOfGoods(tx, sale);
            const ratio = Number(sale.totalAmount) > 0 ? Number(returnRecord.amount) / Number(sale.totalAmount) : 1;
            await postSaleReturnAccounting(tx, { sale, returnRecord, costOfGoods: Math.round(originalCost * Math.min(1, ratio) * 100) / 100 });
            summary.returns.posted += 1;
          }
        }
      }
      const purchases = await tx.purchase.findMany({ where: { status: "RECEIVED" }, orderBy: { createdAt: "asc" } });
      for (const purchase of purchases) {
        summary.purchases.scanned += 1;
        if (!(await hasPostedReference(tx, "PURCHASE", purchase.id)) && repair) { await postPurchaseAccounting(tx, purchase, "CASH"); summary.purchases.posted += 1; }
      }
      const payments = await tx.vendorPayment.findMany({ orderBy: { createdAt: "asc" } });
      for (const payment of payments) {
        summary.vendorPayments.scanned += 1;
        if (!(await hasPostedReference(tx, "VENDOR_PAYMENT", payment.id)) && repair) { await postVendorPaymentAccounting(tx, payment); summary.vendorPayments.posted += 1; }
      }
      const incomes = await tx.income.findMany({ orderBy: { createdAt: "asc" } });
      for (const income of incomes) {
        summary.income.scanned += 1;
        if (!(await hasPostedReference(tx, "INCOME", income.id)) && repair) {
          await postTransaction(tx, { account: "Cash", type: "DEBIT", amount: income.amount, description: `Income: ${income.source}`, refType: "INCOME", refId: income.id });
          await postTransaction(tx, { account: "Other Income", type: "CREDIT", amount: income.amount, description: `Income: ${income.source}`, refType: "INCOME", refId: income.id });
          summary.income.posted += 1;
        }
      }
      const expenses = await tx.expense.findMany({ orderBy: { createdAt: "asc" } });
      for (const expense of expenses) {
        summary.expenses.scanned += 1;
        if (!(await hasPostedReference(tx, "EXPENSE", expense.id)) && repair) {
          await postTransaction(tx, { account: "Operating Expenses", type: "DEBIT", amount: expense.amount, description: `Expense: ${expense.category}`, refType: "EXPENSE", refId: expense.id });
          await postTransaction(tx, { account: "Cash", type: "CREDIT", amount: expense.amount, description: `Expense: ${expense.category}`, refType: "EXPENSE", refId: expense.id });
          summary.expenses.posted += 1;
        }
      }
      if (repair) await tx.auditLog.create({ data: { userId: auth.session.user.id, action: "CREATE", module: "accounting", metadata: { type: "ACCOUNTING_RECONCILIATION", summary } } });
      return summary;
    });
    return NextResponse.json({ repair, ...result });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to reconcile accounting" }, { status: 400 });
  }
}
