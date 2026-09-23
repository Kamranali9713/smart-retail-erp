import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, hasPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!hasPermission(session, "inventory", "view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") || "";
  const action = searchParams.get("action") || "";
  const limit = Math.min(Number(searchParams.get("limit") || 250), 500);
  const logs = await prisma.inventoryLog.findMany({
    where: { ...(productId ? { productId } : {}), ...(action ? { action } : {}) },
    include: { product: { select: { id: true, name: true, sku: true, barcode: true, costPrice: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
  });
  const balances = new Map();
  const rows = logs.map((log) => {
    const previous = balances.get(log.productId) || 0;
    const inbound = ["STOCK_IN", "PURCHASE", "RETURN"].includes(log.action);
    const delta = inbound ? Number(log.quantity) : -Number(log.quantity);
    const balance = previous + delta;
    balances.set(log.productId, balance);
    return { ...log, quantity: Number(log.quantity), balance, inbound };
  });
  return NextResponse.json(rows.reverse());
}
