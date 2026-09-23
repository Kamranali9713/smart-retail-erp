import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { parseDateRange, getTrialBalance, getProfitAndLoss, getBalanceSheet, getCashFlow } from "@/lib/financial-reports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req) {
  const auth = await requirePermission("accounting", "view");
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const report = searchParams.get("report") || "trial-balance";
    const range = parseDateRange(searchParams);
    let data;

    if (report === "trial-balance") data = await getTrialBalance(range);
    else if (report === "profit-loss") data = await getProfitAndLoss(range);
    else if (report === "balance-sheet") data = await getBalanceSheet(range);
    else if (report === "cash-flow") data = await getCashFlow(range);
    else return NextResponse.json({ error: "Unsupported accounting report" }, { status: 400 });

    return NextResponse.json({ report, ...data });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 400 });
  }
}
