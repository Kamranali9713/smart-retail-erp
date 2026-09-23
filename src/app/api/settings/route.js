import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("settings", "view");
  if (auth.response) return auth.response;

  let settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { id: "singleton" } });
  }

  return NextResponse.json(settings);
}

export async function PUT(req) {
  const auth = await requirePermission("settings", "edit");
  if (auth.response) return auth.response;

  const body = await req.json();
  const allowed = [
    "storeName",
    "logoUrl",
    "address",
    "phone",
    "email",
    "defaultTaxRate",
    "receiptWidth",
    "lowStockThreshold",
    "autoBarcode",
  ];
  const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));

  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json(settings);
}
