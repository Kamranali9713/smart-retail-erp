import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { postJournalEntry } from "@/lib/accounting";

export const runtime = "nodejs";

export async function POST(req) {
  const auth = await requirePermission("accounting", "create");
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const description = String(body.description || "Manual journal entry").trim();
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const result = await prisma.$transaction(async (tx) => {
      const posted = await postJournalEntry(tx, { entries, description, refType: "MANUAL", refId: body.refId || null });
      await tx.auditLog.create({ data: { userId: auth.session.user.id, action: "CREATE", module: "accounting", entityId: posted.journalEntry.id, metadata: { type: "journal", entryNo: posted.journalEntry.entryNo, description, lines: posted.transactions.length, debitTotal: posted.debitTotal, creditTotal: posted.creditTotal } } });
      return posted;
    });
    return NextResponse.json({ success: true, journalEntry: result.journalEntry, entries: result.transactions, debitTotal: result.debitTotal, creditTotal: result.creditTotal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to post journal entry" }, { status: 422 });
  }
}
