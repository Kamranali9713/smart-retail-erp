"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function InventoryValuationPage() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/inventory/valuation", { cache: "no-store" });
    const json = await response.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const rows = (data?.rows || []).filter((row) => `${row.name} ${row.sku} ${row.category} ${row.brand}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Inventory Valuation</h1><p className="text-sm text-muted-foreground">Current stock valued at each product's recorded cost price.</p></div>
        <button onClick={load} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Refresh</button>
      </div>
      {data && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Products</div><div className="text-xl font-bold">{data.totals.products}</div></div>
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Total Units</div><div className="text-xl font-bold">{data.totals.quantity}</div></div>
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Stock Value</div><div className="text-xl font-bold">{formatCurrency(data.totals.value)}</div></div>
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Low / Out</div><div className="text-xl font-bold">{data.totals.lowStock} / {data.totals.outOfStock}</div></div>
      </div>}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, category..." className="w-full md:w-96 border border-border rounded-md px-3 py-2 bg-background" /></div>
        {loading ? <div className="p-6 text-sm text-muted-foreground">Loading…</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary/50"><tr><th className="text-left px-4 py-3">Product</th><th className="text-left px-4 py-3">SKU</th><th className="text-left px-4 py-3">Category</th><th className="text-right px-4 py-3">Qty</th><th className="text-right px-4 py-3">Unit Cost</th><th className="text-right px-4 py-3">Value</th></tr></thead><tbody className="divide-y divide-border/60">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3">{row.name}</td><td className="px-4 py-3">{row.sku}</td><td className="px-4 py-3">{row.category}</td><td className={`px-4 py-3 text-right ${row.quantity <= row.reorderLevel ? "text-destructive font-semibold" : ""}`}>{row.quantity}</td><td className="px-4 py-3 text-right">{formatCurrency(row.unitCost)}</td><td className="px-4 py-3 text-right font-medium">{formatCurrency(row.value)}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  );
}
