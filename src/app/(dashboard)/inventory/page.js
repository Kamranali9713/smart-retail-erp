"use client";
import { useEffect, useState } from "react";
import { formatCurrency, generateSKU } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", sku: "", barcode: "", costPrice: 0, sellingPrice: 0, taxRate: 0,
    openingStock: 0, lowStockAlert: 10, categoryId: "",
  });

  function load() {
    fetch("/api/products").then((r) => r.json()).then(setProducts);
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }
  useEffect(load, []);

  async function addProduct(e) {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sku: form.sku || generateSKU(form.name) }),
    });
    setShowForm(false);
    setForm({ name: "", sku: "", barcode: "", costPrice: 0, sellingPrice: 0, taxRate: 0, openingStock: 0, lowStockAlert: 10, categoryId: "" });
    load();
  }

  async function adjustStock(productId, action) {
    const qty = prompt(`Enter quantity for ${action}:`);
    if (!qty) return;
    await fetch("/api/stock/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, action, quantity: Number(qty) }),
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Add Product</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addProduct} className="space-y-3">
              <input required placeholder="Product name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input placeholder="Barcode (optional)" value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border border-border rounded-md px-3 py-2 bg-background">
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Cost price" value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
                  className="border border-border rounded-md px-3 py-2 bg-background" />
                <input type="number" placeholder="Selling price" value={form.sellingPrice}
                  onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                  className="border border-border rounded-md px-3 py-2 bg-background" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Tax %" value={form.taxRate}
                  onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                  className="border border-border rounded-md px-3 py-2 bg-background" />
                <input type="number" placeholder="Opening stock" value={form.openingStock}
                  onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })}
                  className="border border-border rounded-md px-3 py-2 bg-background" />
              </div>
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="p-3">Name</th><th className="p-3">SKU</th><th className="p-3">Category</th>
              <th className="p-3">Cost</th><th className="p-3">Price</th><th className="p-3">Stock</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.name}</td>
                <td className="p-3">{p.sku}</td>
                <td className="p-3">{p.category?.name || "-"}</td>
                <td className="p-3">{formatCurrency(p.costPrice)}</td>
                <td className="p-3">{formatCurrency(p.sellingPrice)}</td>
                <td className={`p-3 font-medium ${p.stock?.quantity <= p.lowStockAlert ? "text-destructive" : ""}`}>
                  {p.stock?.quantity ?? 0}
                </td>
                <td className="p-3 space-x-2">
                  <button onClick={() => adjustStock(p.id, "STOCK_IN")} className="text-xs underline">Stock In</button>
                  <button onClick={() => adjustStock(p.id, "STOCK_OUT")} className="text-xs underline">Stock Out</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
