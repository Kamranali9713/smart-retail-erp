import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postTransaction } from "@/lib/accounting";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "accounting", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.income.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(req) {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "accounting", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!body.source?.trim() || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Source and a positive amount are required" }, { status: 422 });
    const item = await prisma.$transaction(async (tx) => {
      const income = await tx.income.create({ data: { source: body.source.trim(), amount, note: body.note || null } });
      const cashAccount = body.paymentMethod === "BANK_TRANSFER" || body.paymentMethod === "CARD" ? "Bank" : "Cash";
      await postTransaction(tx, { account: cashAccount, type: "DEBIT", amount, description: `Income: ${income.source}`, refType: "INCOME", refId: income.id });
      await postTransaction(tx, { account: "Other Income", type: "CREDIT", amount, description: `Income: ${income.source}`, refType: "INCOME", refId: income.id });
      await tx.auditLog.create({ data: { userId: s.user.id, action: "CREATE", module: "accounting", entityId: income.id, metadata: { type: "income", amount } } });
      return income;
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error.message || "Unable to create income" }, { status: 400 }); }
}
