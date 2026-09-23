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
      const rows = await postJournalEntry(tx, { entries, description, refType: "MANUAL" });
      await tx.auditLog.create({ data: { userId: auth.session.user.id, action: "CREATE", module: "accounting", metadata: { type: "journal", description, lines: rows.length } } });
      return rows;
    });
    return NextResponse.json({ success: true, entries: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to post journal entry" }, { status: 422 });
  }
}
