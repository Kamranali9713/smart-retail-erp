import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const auth = await requirePermission("inventory", "view");
  if (auth.response) return auth.response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") || "";
  const action = searchParams.get("action") || "";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 250), 1), 500);

  const logs = await prisma.inventoryLog.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(action ? { action } : {}),
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          costPrice: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  // Calculate balances from the complete movement history first.
  // Limiting before calculating would produce incorrect running balances.
  const balances = new Map();
  const rows = logs.map((log) => {
    const previous = balances.get(log.productId) || 0;
    const inbound = ["STOCK_IN", "PURCHASE", "RETURN"].includes(log.action);
    const delta = inbound ? Number(log.quantity) : -Number(log.quantity);
    const balance = previous + delta;
    balances.set(log.productId, balance);

    return {
      ...log,
      quantity: Number(log.quantity),
      balance,
      inbound,
    };
  });

  return NextResponse.json(rows.slice(-limit).reverse());
}
