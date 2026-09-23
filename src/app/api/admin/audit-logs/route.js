import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "users", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const action = searchParams.get("action") || "";
  const module = searchParams.get("module") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 100), 250);
  const logs = await prisma.auditLog.findMany({
    where: {
      ...(action ? { action } : {}),
      ...(module ? { module } : {}),
      ...(q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { module: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(logs);
}
