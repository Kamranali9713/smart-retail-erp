import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSKU } from "@/lib/utils";
import { productSchema, validate } from "@/lib/validation";

export async function GET(req) {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "inventory", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const categoryId = searchParams.get("categoryId");
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        AND: [categoryId ? { categoryId } : {}, q ? { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { barcode: { contains: q, mode: "insensitive" } },
        ] } : {}],
      },
      include: { category: true, brand: true, unit: true, stock: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json({ error: "Unable to load products" }, { status: 500 });
  }
}

export async function POST(req) {
  const s = await getServerSession(authOptions);
  if (!hasPermission(s, "inventory", "create")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const raw = await req.json();
    const body = validate(productSchema, raw);
    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku || generateSKU(body.name),
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
        stock: { create: { quantity: body.openingStock || 0 } },
      },
      include: { stock: true },
    });
    if ((body.openingStock || 0) > 0) {
      await prisma.inventoryLog.create({ data: { productId: product.id, action: "STOCK_IN", quantity: body.openingStock, reason: "Opening stock" } });
    }
    await prisma.auditLog.create({ data: { userId: s.user.id, action: "CREATE", module: "inventory", entityId: product.id, metadata: { name: product.name, sku: product.sku } } });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    const status = err.status || 400;
    return NextResponse.json({ error: err.message || "Unable to create product", issues: err.issues }, { status });
  }
}
