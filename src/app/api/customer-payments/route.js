import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { getCustomerOutstanding, postCustomerPaymentAccounting } from "@/lib/accounting";

export async function POST(req) {
  const auth = await requirePermission("customers", "create");
  if (auth.response) return auth.response;

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const method = ["CASH", "CARD", "BANK_TRANSFER"].includes(body.method) ? body.method : "CASH";

    if (!body.customerId || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Customer and a positive payment amount are required" }, { status: 422 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: body.customerId }, select: { id: true, name: true } });
      if (!customer) throw new Error("Customer not found");

      const outstanding = await getCustomerOutstanding(tx, customer.id);
      if (amount > outstanding + 0.009) {
        throw new Error(`Payment exceeds customer outstanding balance of ${outstanding.toFixed(2)}`);
      }

      const payment = await tx.customerPayment.create({
        data: { customerId: customer.id, amount, method, note: body.note || null },
      });

      await postCustomerPaymentAccounting(tx, payment);

      await tx.auditLog.create({
        data: {
          userId: auth.session.user.id,
          action: "CREATE",
          module: "customers",
          entityId: payment.id,
          metadata: { type: "CUSTOMER_PAYMENT", customerId: customer.id, amount, method },
        },
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to record customer payment" }, { status: 400 });
  }
}
