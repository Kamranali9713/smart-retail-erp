import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  action: z.enum(["STOCK_IN", "STOCK_OUT"]),
  quantity: z.coerce.number().int().min(0).max(100000000),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function POST(req) {
  const auth = await requirePermission("inventory", "edit");
  if (auth.response) return auth.response;

  try {
    const body = adjustmentSchema.parse(await req.json());

    if (body.quantity === 0) {
      return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 422 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: body.productId },
        include: { stock: true },
      });

      if (!product || !product.isActive) {
        throw new Error("Product not found or inactive");
      }

      const currentQty = product.stock?.quantity || 0;
      let newQty;

      if (body.action === "STOCK_IN") {
        newQty = currentQty + body.quantity;
      } else if (body.action === "STOCK_OUT") {
        newQty = currentQty - body.quantity;
      }

      if (newQty < 0) {
        throw new Error(`Insufficient stock. Available quantity: ${currentQty}`);
      }

      const stock = await tx.stock.upsert({
        where: { productId: body.productId },
        create: { productId: body.productId, quantity: newQty },
        update: { quantity: newQty },
      });

      const log = await tx.inventoryLog.create({
        data: {
          productId: body.productId,
          action: body.action,
          quantity: body.quantity,
          reason: body.reason || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auth.session.user.id,
          action: "STOCK_CHANGE",
          module: "inventory",
          entityId: body.productId,
          metadata: {
            productName: product.name,
            action: body.action,
            quantity: body.quantity,
            previousQuantity: currentQty,
            newQuantity: newQty,
            reason: body.reason || null,
          },
        },
      });

      return { stock, log, previousQuantity: currentQty };
    });

    return NextResponse.json({
      success: true,
      quantity: result.stock.quantity,
      previousQuantity: result.previousQuantity,
      log: result.log,
    });
  } catch (error) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid stock adjustment", issues: error.issues }, { status: 422 });
    }

    return NextResponse.json({ error: error.message || "Unable to adjust stock" }, { status: 400 });
  }
}
