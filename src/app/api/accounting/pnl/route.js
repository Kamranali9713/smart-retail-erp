import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { parseDateRange, getProfitAndLoss } from "@/lib/financial-reports";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const auth = await requirePermission("accounting", "view");
  if (auth.response) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const data = await getProfitAndLoss(parseDateRange(searchParams));
    const salesRevenue = data.revenueRows.filter((row) => row.name === "Sales Revenue").reduce((sum, row) => sum + row.amount, 0);
    const otherIncome = data.revenueRows.filter((row) => row.name !== "Sales Revenue").reduce((sum, row) => sum + row.amount, 0);
    const purchaseCost = 0;
    const expenses = data.totalExpenses;
    return NextResponse.json({ ...data, salesRevenue, otherIncome, purchaseCost, expenses, totalCost: expenses, totalRevenue: data.totalRevenue });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
