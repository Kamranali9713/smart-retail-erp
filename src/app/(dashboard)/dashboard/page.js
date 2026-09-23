"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <p className="text-muted-foreground">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Daily Sales" value={formatCurrency(data.dailySales)} />
        <StatCard label="Monthly Sales" value={formatCurrency(data.monthlySales)} />
        <StatCard label="Annual Sales" value={formatCurrency(data.annualSales)} />
        <StatCard label="Total Sales" value={formatCurrency(data.totalSales)} />
        <StatCard label="Total Purchases" value={formatCurrency(data.totalPurchases)} />
        <StatCard label="Inventory Value" value={formatCurrency(data.inventoryValue)} />
        <StatCard label="Total Vendors" value={data.totalVendors} />
        <StatCard label="Total Products" value={data.totalProducts} />
        <StatCard label="Total Customers" value={data.totalCustomers} />
        <StatCard label="Low Stock" value={data.lowStock} accent="text-yellow-600" />
        <StatCard label="Out of Stock" value={data.outOfStock} accent="text-destructive" />
        <StatCard
          label="Profit & Loss"
          value={formatCurrency(data.profitLoss)}
          accent={data.profitLoss >= 0 ? "text-green-600" : "text-destructive"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Sales Trend (7 days)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="hsl(222,89%,55%)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.topProducts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="qty" fill="hsl(222,89%,55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold mb-3">Recent Transactions</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border">
              <th className="py-2">Invoice</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.map((t) => (
              <tr key={t.id} className="border-b border-border/50">
                <td className="py-2">{t.invoiceNo}</td>
                <td>{t.customer}</td>
                <td>{formatCurrency(t.total)}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
