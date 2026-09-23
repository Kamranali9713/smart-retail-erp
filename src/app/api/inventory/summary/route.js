import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePermission("inventory", "view");
  if (auth.response) return auth.response;

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { stock: true },
  });

  const today = new Date();
  const expiryWindow = new Date(today);
  expiryWindow.setDate(expiryWindow.getDate() + 30);

  const rows = products.map((product) => {
    const quantity = product.stock?.quantity || 0;
    const reorderLevel = product.lowStockAlert || 0;
    const expiryDate = product.expiryDate;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      quantity,
      reorderLevel,
      lowStock: quantity > 0 && quantity <= reorderLevel,
      outOfStock: quantity <= 0,
      expired: Boolean(expiryDate && expiryDate < today),
      expiringSoon: Boolean(expiryDate && expiryDate >= today && expiryDate <= expiryWindow),
      expiryDate,
    };
  });

  return NextResponse.json({
    totals: {
      products: rows.length,
      units: rows.reduce((sum, row) => sum + row.quantity, 0),
      lowStock: rows.filter((row) => row.lowStock).length,
      outOfStock: rows.filter((row) => row.outOfStock).length,
      expired: rows.filter((row) => row.expired).length,
      expiringSoon: rows.filter((row) => row.expiringSoon).length,
    },
    lowStock: rows.filter((row) => row.lowStock),
    outOfStock: rows.filter((row) => row.outOfStock),
    expiry: rows.filter((row) => row.expired || row.expiringSoon),
  });
}
