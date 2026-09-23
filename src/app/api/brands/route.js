import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const auth = await requirePermission("inventory", "view");
  if (auth.response) return auth.response;
  const items = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(items);
}

export async function POST(req) {
  const auth = await requirePermission("inventory", "create");
  if (auth.response) return auth.response;
  const body = await req.json();
  const item = await prisma.brand.create({ data: { name: body.name } });
  return NextResponse.json(item, { status: 201 });
}
