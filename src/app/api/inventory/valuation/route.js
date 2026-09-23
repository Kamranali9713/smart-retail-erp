import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("inventory", "view");
  if (auth.response) return auth.response;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { stock: true, category: true, brand: true, unit: true },
    orderBy: { name: "asc" },
  });

  const rows = products.map((product) => {
    const quantity = Number(product.stock?.quantity || 0);
    const unitCost = Number(product.costPrice || 0);
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category?.name || "Uncategorized",
      brand: product.brand?.name || "",
      unit: product.unit?.name || "pcs",
      quantity,
      unitCost,
      value: quantity * unitCost,
      reorderLevel: product.lowStockAlert,
    };
  });

  return NextResponse.json({
    rows,
    totals: {
      quantity: rows.reduce((s, r) => s + r.quantity, 0),
      value: rows.reduce((s, r) => s + r.value, 0),
      products: rows.length,
      lowStock: rows.filter((r) => r.quantity <= r.reorderLevel).length,
      outOfStock: rows.filter((r) => r.quantity <= 0).length,
    },
  });
}
