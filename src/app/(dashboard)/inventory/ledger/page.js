"use client";

import { useEffect, useMemo, useState } from "react";

const ACTIONS = ["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "SALE", "RETURN", "PURCHASE"];

export default function StockLedgerPage() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (productId) params.set("productId", productId);
    if (action) params.set("action", action);
    params.set("limit", "500");

    const response = await fetch(`/api/inventory/ledger?${params.toString()}`, { cache: "no-store" });
    const data = await response.json();
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetch("/api/products").then((r) => r.json()).then((data) => setProducts(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => { load(); }, [productId, action]);

  const stats = useMemo(() => ({
    in: rows.filter((r) => r.inbound).reduce((sum, r) => sum + Number(r.quantity || 0), 0),
    out: rows.filter((r) => !r.inbound).reduce((sum, r) => sum + Number(r.quantity || 0), 0),
  }), [rows]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Stock Ledger</h1>
        <p className="text-sm text-muted-foreground">Complete stock movement history with running balances.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Movements</div><div className="text-xl font-bold">{rows.length}</div></div>
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Units In</div><div className="text-xl font-bold">{stats.in}</div></div>
        <div className="bg-card border border-border rounded-lg p-4"><div className="text-xs text-muted-foreground">Units Out</div><div className="text-xl font-bold">{stats.out}</div></div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background flex-1">
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background">
          <option value="">All movements</option>
          {ACTIONS.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
        <button onClick={load} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Refresh</button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Action</th>
              <th className="p-3 text-right">Qty In</th>
              <th className="p-3 text-right">Qty Out</th>
              <th className="p-3 text-right">Balance</th>
              <th className="p-3 text-left">Reference / Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">Loading ledger...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="7" className="p-6 text-center text-muted-foreground">No stock movements found.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-3">{row.product?.name}<div className="text-xs text-muted-foreground">{row.product?.sku}</div></td>
                <td className="p-3">{row.action.replaceAll("_", " ")}</td>
                <td className="p-3 text-right">{row.inbound ? row.quantity : 0}</td>
                <td className="p-3 text-right">{row.inbound ? 0 : row.quantity}</td>
                <td className="p-3 text-right font-medium">{row.balance}</td>
                <td className="p-3">{row.reason || row.refId || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
