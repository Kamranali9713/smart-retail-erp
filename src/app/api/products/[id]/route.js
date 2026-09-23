import { requirePermission } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req, { params }) {
  const auth = await requirePermission("inventory", "edit");
  if (auth.response) return auth.response;
  const body = await req.json();
  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        barcode: body.barcode || null,
        description: body.description || null,
        categoryId: body.categoryId || null,
        brandId: body.brandId || null,
        unitId: body.unitId || null,
        costPrice: body.costPrice,
        sellingPrice: body.sellingPrice,
        taxRate: body.taxRate,
        lowStockAlert: body.lowStockAlert,
      },
    });
    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const auth = await requirePermission("inventory", "delete");
  if (auth.response) return auth.response;
  try {
    await prisma.product.update({ where: { id: params.id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
