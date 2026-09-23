import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "backups", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const backups = await prisma.backup.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(backups);
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "backups", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const backup = await prisma.backup.create({
    data: { fileName: body.fileName || `smart-retail-backup-${Date.now()}.sql`, sizeBytes: Number(body.sizeBytes || 0), status: "REQUESTED" },
  });
  await prisma.auditLog.create({ data: { userId: session.user.id, action: "CREATE", module: "backups", entityId: backup.id, metadata: { fileName: backup.fileName, status: "REQUESTED" } } });
  return NextResponse.json(backup, { status: 201 });
}
