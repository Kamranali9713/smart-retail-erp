import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema, validate } from "@/lib/validation";

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "customers", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await prisma.customer.findMany({ include: { _count: { select: { sales: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(rows);
}

export async function POST(req) {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "customers", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = validate(customerSchema, await req.json());
    const row = await prisma.customer.create({ data: { name: body.name, phone: body.phone || null, email: body.email || null, address: body.address || null } });
    await prisma.auditLog.create({ data: { userId: s.user.id, action: "CREATE", module: "customers", entityId: row.id, metadata: { name: row.name } } });
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Unable to create customer", issues: err.issues }, { status: err.status || 400 });
  }
}
