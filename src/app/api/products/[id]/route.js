import { requirePermission } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema, validate } from "@/lib/validation";

export async function GET(req, { params }) {
  const auth = await requirePermission("inventory", "view");
  if (auth.response) return auth.response;

  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { category: true, brand: true, unit: true, stock: true, variants: true },
    });

    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req, { params }) {
  const auth = await requirePermission("inventory", "edit");
  if (auth.response) return auth.response;

  try {
    const body = validate(productSchema, await req.json());

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
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "UPDATE",
        module: "inventory",
        entityId: product.id,
        metadata: { name: product.name, sku: product.sku },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    const status = error.status || 400;
    return NextResponse.json({ error: error.message, issues: error.issues }, { status });
  }
}

export async function DELETE(req, { params }) {
  const auth = await requirePermission("inventory", "delete");
  if (auth.response) return auth.response;

  try {
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        userId: auth.session.user.id,
        action: "DELETE",
        module: "inventory",
        entityId: product.id,
        metadata: { name: product.name, sku: product.sku },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
