import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export async function GET(req, { params }) {
  const auth = await requirePermission("customers", "view");
  if (auth.response) return auth.response;

  const customer = await prisma.customer.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId: params.id, status: { in: ["COMPLETED", "RETURNED", "REFUNDED"] }, paymentMethod: "CREDIT" },
      include: { returns: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.customerPayment.findMany({
      where: { customerId: params.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const entries = [];
  for (const sale of sales) {
    entries.push({
      date: sale.createdAt,
      reference: sale.invoiceNo,
      description: `Credit sale ${sale.status}`,
      debit: Number(sale.totalAmount),
      credit: 0,
      type: "SALE",
      saleId: sale.id,
    });
    for (const ret of sale.returns) {
      entries.push({
        date: ret.createdAt,
        reference: sale.invoiceNo,
        description: `Sales return${ret.reason ? ` — ${ret.reason}` : ""}`,
        debit: 0,
        credit: Number(ret.amount),
        type: "RETURN",
        saleId: sale.id,
      });
    }
  }

  for (const payment of payments) {
    entries.push({
      date: payment.createdAt,
      reference: `PAY-${payment.id.slice(-8)}`,
      description: `Customer payment ${payment.method}${payment.note ? ` — ${payment.note}` : ""}`,
      debit: 0,
      credit: Number(payment.amount),
      type: "PAYMENT",
      paymentId: payment.id,
    });
  }

  entries.sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  const rows = entries.map((entry) => {
    balance += Number(entry.debit) - Number(entry.credit);
    return { ...entry, balance };
  });

  return NextResponse.json({
    customer,
    rows: rows.reverse(),
    summary: {
      billed: rows.reduce((sum, x) => sum + Number(x.debit), 0),
      credited: rows.reduce((sum, x) => sum + Number(x.credit), 0),
      outstanding: Math.max(0, balance),
    },
  });
}
