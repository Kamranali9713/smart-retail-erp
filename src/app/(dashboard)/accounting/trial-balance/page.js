"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

export default function TrialBalancePage() {
  const [filters, setFilters] = useState({ from: monthStart(), to: today() });
  const [data, setData] = useState({ rows: [], totals: { debit: 0, credit: 0 }, balanced: true, difference: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/accounting/trial-balance?from=${filters.from}&to=${filters.to}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load trial balance");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function exportCsv() {
    const lines = [
      ["Account", "Type", "Debit", "Credit"].join(","),
      ...data.rows.map((row) => [row.name, row.type, row.debit.toFixed(2), row.credit.toFixed(2)].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")),
      ["TOTAL", "", data.totals.debit.toFixed(2), data.totals.credit.toFixed(2)].join(","),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `trial-balance-${today()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Trial Balance</h1><p className="text-sm text-muted-foreground">Verify that total debits equal total credits for the selected period.</p></div>
        <div className="flex gap-2"><button onClick={exportCsv} disabled={!data.rows.length} className="px-4 py-2 rounded-md border border-border text-sm disabled:opacity-50">Export CSV</button><button onClick={load} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Refresh</button></div>
      </div>
      <div className="bg-card border border-border rounded-lg p-4 grid md:grid-cols-3 gap-3">
        <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="border border-border rounded-md px-3 py-2 bg-background" />
        <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="border border-border rounded-md px-3 py-2 bg-background" />
        <button onClick={load} className="px-4 py-2 rounded-md border border-border font-medium">Apply</button>
      </div>
      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Debit</p><p className="text-xl font-bold">{formatCurrency(data.totals.debit)}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Credit</p><p className="text-xl font-bold">{formatCurrency(data.totals.credit)}</p></div>
        <div className={`bg-card border rounded-lg p-4 ${data.balanced ? "border-border" : "border-destructive/50"}`}><p className="text-xs text-muted-foreground">Status</p><p className={`text-xl font-bold ${data.balanced ? "text-emerald-600" : "text-destructive"}`}>{data.balanced ? "Balanced" : `Difference ${formatCurrency(Math.abs(data.difference))}`}</p></div>
      </div>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold">Accounts</div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Account</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th></tr></thead>
          <tbody>{data.rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3">{row.name}</td><td className="p-3">{row.type}</td><td className="p-3 text-right">{row.debit ? formatCurrency(row.debit) : "—"}</td><td className="p-3 text-right">{row.credit ? formatCurrency(row.credit) : "—"}</td></tr>)}</tbody>
          <tfoot className="bg-secondary font-semibold"><tr><td className="p-3" colSpan="2">Total</td><td className="p-3 text-right">{formatCurrency(data.totals.debit)}</td><td className="p-3 text-right">{formatCurrency(data.totals.credit)}</td></tr></tfoot>
        </table></div>
        {!loading && !data.rows.length && <div className="p-8 text-center text-sm text-muted-foreground">No accounting transactions for this period.</div>}
        {loading && <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}
      </div>
    </div>
  );
}
