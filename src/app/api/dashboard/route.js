import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import {
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  format,
} from "date-fns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requirePermission("dashboard", "view");

  if (auth.response) {
    return auth.response;
  }

  try {
    const now = new Date();

    const todayStart = startOfDay(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const [
      dailySales,
      monthlySales,
      annualSales,
      totalSalesAgg,
      totalPurchasesAgg,
    ] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: todayStart },
          status: "COMPLETED",
        },
      }),

      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: monthStart },
          status: "COMPLETED",
        },
      }),

      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: yearStart },
          status: "COMPLETED",
        },
      }),

      prisma.sale.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: "COMPLETED",
        },
      }),

      prisma.purchase.aggregate({
        _sum: { totalAmount: true },
      }),
    ]);

    const [totalVendors, totalProducts, totalCustomers] = await Promise.all([
      prisma.vendor.count(),
      prisma.product.count(),
      prisma.customer.count(),
    ]);

    const stocks = await prisma.stock.findMany({
      include: {
        product: true,
      },
    });

    const lowStock = stocks.filter(
      (s) => s.quantity <= (s.product.lowStockAlert ?? 10) && s.quantity > 0,
    ).length;

    const outOfStock = stocks.filter((s) => s.quantity <= 0).length;

    const inventoryValue = stocks.reduce(
      (acc, s) => acc + s.quantity * Number(s.product.costPrice || 0),
      0,
    );

    // Last 7 days sales trend
    const days = [...Array(7)].map((_, i) => subDays(now, 6 - i));

    const salesTrend = [];

    for (const d of days) {
      const dayStart = startOfDay(d);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const sum = await prisma.sale.aggregate({
        _sum: {
          totalAmount: true,
        },
        where: {
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
          status: "COMPLETED",
        },
      });

      salesTrend.push({
        date: format(d, "MM/dd"),
        sales: Number(sum._sum.totalAmount || 0),
      });
    }

    const topProductsRaw = await prisma.saleItem.groupBy({
      by: ["productId"],
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 5,
    });

    const topProducts = await Promise.all(
      topProductsRaw.map(async (t) => {
        const p = await prisma.product.findUnique({
          where: {
            id: t.productId,
          },
        });

        return {
          name: p?.name || "Unknown",
          qty: t._sum.quantity,
          total: Number(t._sum.total || 0),
        };
      }),
    );

    const recentTransactions = await prisma.sale.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      include: {
        customer: true,
      },
    });

    const totalExpenses = await prisma.expense.aggregate({
      _sum: {
        amount: true,
      },
    });

    const totalIncome = await prisma.income.aggregate({
      _sum: {
        amount: true,
      },
    });

    const totalSales = Number(totalSalesAgg._sum.totalAmount || 0);

    const totalPurchases = Number(totalPurchasesAgg._sum.totalAmount || 0);

    const income = Number(totalIncome._sum.amount || 0);

    const expenses = Number(totalExpenses._sum.amount || 0);

    return NextResponse.json({
      dailySales: Number(dailySales._sum.totalAmount || 0),

      monthlySales: Number(monthlySales._sum.totalAmount || 0),

      annualSales: Number(annualSales._sum.totalAmount || 0),

      totalSales,

      totalPurchases,

      totalVendors,

      totalProducts,

      totalCustomers,

      lowStock,

      outOfStock,

      inventoryValue,

      profitLoss: totalSales + income - totalPurchases - expenses,

      salesTrend,

      topProducts,

      recentTransactions: recentTransactions.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customer: s.customer?.name || "Walk-in",
        total: Number(s.totalAmount),
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    console.error("Dashboard API error:", err);

    return NextResponse.json(
      {
        error: "Failed to load dashboard",
      },
      {
        status: 500,
      },
    );
  }
}
