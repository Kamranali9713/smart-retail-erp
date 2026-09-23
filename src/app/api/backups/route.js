import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const auth = await requirePermission("backups", "view");
  if (auth.response) return auth.response;
  const backups = await prisma.backup.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(backups);
}

// Records a backup entry. Actual pg_dump execution should be run via the
// provided scripts/backup.sh (see README) — this endpoint logs the event.
export async function POST(req) {
  const auth = await requirePermission("backups", "create");
  if (auth.response) return auth.response;
  const body = await req.json();
  const backup = await prisma.backup.create({
    data: {
      fileName: body.fileName || `backup-${Date.now()}.sql`,
      sizeBytes: body.sizeBytes || 0,
      status: "COMPLETED",
    },
  });
  return NextResponse.json(backup, { status: 201 });
}
