import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePermission("users", "view");
  if (auth.response) return auth.response;

  const roles = await prisma.role.findMany({
    include: { permissions: true },
    orderBy: { label: "asc" },
  });

  return NextResponse.json(roles);
}
