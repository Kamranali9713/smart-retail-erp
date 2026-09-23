import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requirePermission } from "@/lib/rbac";

export async function GET() {
  const auth = await requirePermission("users", "view");
  if (auth.response) return auth.response;

  const users = await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users.map(({ password, ...u }) => u));
}

export async function POST(req) {
  const auth = await requirePermission("users", "create");
  if (auth.response) return auth.response;

  const body = await req.json();

  if (!body.name || !body.email || !body.password || !body.roleId) {
    return NextResponse.json(
      { error: "name, email, password and roleId are required" },
      { status: 400 }
    );
  }

  const hashed = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase().trim(),
      password: hashed,
      roleId: body.roleId,
      isActive: body.isActive ?? true,
    },
    include: { role: true },
  });

  const { password, ...safe } = user;
  return NextResponse.json(safe, { status: 201 });
}
