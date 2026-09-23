import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postTransaction } from "@/lib/accounting";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "accounting", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.expense.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(req) {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "accounting", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await req.json();
    const amount = Number(body.amount);
    if (!body.category?.trim() || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Category and a positive amount are required" }, { status: 422 });
    const item = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({ data: { category: body.category.trim(), amount, note: body.note || null } });
      const cashAccount = body.paymentMethod === "BANK_TRANSFER" || body.paymentMethod === "CARD" ? "Bank" : "Cash";
      await postTransaction(tx, { account: "Operating Expenses", type: "DEBIT", amount, description: `Expense: ${expense.category}`, refType: "EXPENSE", refId: expense.id });
      await postTransaction(tx, { account: cashAccount, type: "CREDIT", amount, description: `Expense: ${expense.category}`, refType: "EXPENSE", refId: expense.id });
      await tx.auditLog.create({ data: { userId: s.user.id, action: "CREATE", module: "accounting", entityId: expense.id, metadata: { type: "expense", amount } } });
      return expense;
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error.message || "Unable to create expense" }, { status: 400 }); }
}
