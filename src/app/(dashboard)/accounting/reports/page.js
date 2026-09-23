"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

const REPORTS = [
  ["trial-balance", "Trial Balance"],
  ["profit-loss", "Profit & Loss"],
  ["balance-sheet", "Balance Sheet"],
  ["cash-flow", "Cash Flow"],
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function Section({ title, rows, totalLabel, total }) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border font-semibold">{title}</div>
      <div className="divide-y divide-border/60">
        {rows.length ? rows.map((row) => (
          <div key={row.id || row.name} className="flex justify-between px-4 py-3 text-sm">
            <span>{row.name}</span>
            <span className="font-medium">{formatCurrency(row.amount)}</span>
          </div>
        )) : <div className="px-4 py-6 text-sm text-muted-foreground">No transactions for this period.</div>}
      </div>
      <div className="flex justify-between px-4 py-3 bg-secondary/50 font-semibold">
        <span>{totalLabel}</span><span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export default function AccountingReportsPage() {
  const [report, setReport] = useState("trial-balance");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/accounting/reports?report=${report}&from=${from}&to=${to}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load report");
      setData(json);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [report]);

  const reportTitle = useMemo(() => REPORTS.find(([key]) => key === report)?.[1] || "Accounting Report", [report]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Phase 3 accounting reports generated from posted ledger transactions.</p>
        </div>
        <button onClick={load} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Refresh</button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 grid md:grid-cols-4 gap-3">
        <select value={report} onChange={(e) => setReport(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background">
          {REPORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background" />
        <button onClick={load} className="px-4 py-2 rounded-md border border-border hover:bg-secondary text-sm font-medium">Apply Date Range</button>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading report…</div>}

      {data && report === "trial-balance" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-semibold">{reportTitle}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50"><tr><th className="text-left px-4 py-3">Account</th><th className="text-left px-4 py-3">Type</th><th className="text-right px-4 py-3">Debit</th><th className="text-right px-4 py-3">Credit</th></tr></thead>
              <tbody className="divide-y divide-border/60">
                {data.rows.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.type}</td><td className="px-4 py-3 text-right">{formatCurrency(row.debitBalance)}</td><td className="px-4 py-3 text-right">{formatCurrency(row.creditBalance)}</td></tr>)}
              </tbody>
              <tfoot className="bg-secondary/50 font-semibold"><tr><td className="px-4 py-3" colSpan="2">Total</td><td className="px-4 py-3 text-right">{formatCurrency(data.totals.debits)}</td><td className="px-4 py-3 text-right">{formatCurrency(data.totals.credits)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}

      {data && report === "profit-loss" && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Revenue" rows={data.revenueRows} totalLabel="Total Revenue" total={data.totalRevenue} />
          <Section title="Expenses" rows={data.expenseRows} totalLabel="Total Expenses" total={data.totalExpenses} />
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 flex justify-between items-center">
            <span className="font-semibold">Net Profit / (Loss)</span><span className={`text-xl font-bold ${data.netProfit >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(data.netProfit)}</span>
          </div>
        </div>
      )}

      {data && report === "balance-sheet" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Section title="Assets" rows={data.assets} totalLabel="Total Assets" total={data.totals.assets} />
          <Section title="Liabilities" rows={data.liabilities} totalLabel="Total Liabilities" total={data.totals.liabilities} />
          <div className="space-y-4">
            <Section title="Equity" rows={data.equity} totalLabel="Equity Accounts" total={data.equity.reduce((s, x) => s + x.amount, 0)} />
            <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Current Period Earnings</span><span>{formatCurrency(data.currentPeriodEarnings)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between font-semibold"><span>Liabilities + Equity</span><span>{formatCurrency(data.totals.liabilitiesAndEquity)}</span></div>
              <div className={`flex justify-between font-semibold ${Math.abs(data.totals.difference) < 0.01 ? "text-green-600" : "text-destructive"}`}><span>Balance Difference</span><span>{formatCurrency(data.totals.difference)}</span></div>
            </div>
          </div>
        </div>
      )}

      {data && report === "cash-flow" && (
        <div className="space-y-4">
          {[["Operating Activities", data.operating], ["Investing Activities", data.investing], ["Financing Activities", data.financing]].map(([title, group]) => (
            <div key={title} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border font-semibold">{title}</div>
              <div className="divide-y divide-border/60">
                {group.items.length ? group.items.map((item) => <div key={item.id} className="px-4 py-3 flex justify-between text-sm"><div><div>{item.description}</div><div className="text-xs text-muted-foreground">{item.account} · {new Date(item.date).toLocaleDateString()}</div></div><span className={item.amount >= 0 ? "text-green-600" : "text-destructive"}>{formatCurrency(item.amount)}</span></div>) : <div className="px-4 py-5 text-sm text-muted-foreground">No cash movements.</div>}
              </div>
              <div className="px-4 py-3 bg-secondary/50 flex justify-between font-semibold"><span>Net {title}</span><span>{formatCurrency(group.total)}</span></div>
            </div>
          ))}
          <div className="bg-card border border-border rounded-lg p-5 grid md:grid-cols-3 gap-4 text-sm">
            <div><div className="text-muted-foreground">Opening Cash & Bank</div><div className="font-bold text-lg">{formatCurrency(data.openingCash)}</div></div>
            <div><div className="text-muted-foreground">Net Change</div><div className={`font-bold text-lg ${data.netChange >= 0 ? "text-green-600" : "text-destructive"}`}>{formatCurrency(data.netChange)}</div></div>
            <div><div className="text-muted-foreground">Closing Cash & Bank</div><div className="font-bold text-lg">{formatCurrency(data.closingCash)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
