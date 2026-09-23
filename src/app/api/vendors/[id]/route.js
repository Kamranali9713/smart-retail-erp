import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function PUT(req, { params }) {
  const auth = await requirePermission("vendors", "edit");
  if (auth.response) return auth.response;
  const body = await req.json();
  const vendor = await prisma.vendor.update({ where: { id: params.id }, data: body });
  return NextResponse.json(vendor);
}

export async function DELETE(req, { params }) {
  const auth = await requirePermission("vendors", "delete");
  if (auth.response) return auth.response;
  await prisma.vendor.update({ where: { id: params.id }, data: { status: "INACTIVE" } });
  return NextResponse.json({ success: true });
}
