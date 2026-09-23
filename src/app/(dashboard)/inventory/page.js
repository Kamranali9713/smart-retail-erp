"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, generateSKU } from "@/lib/utils";
import { Plus, X, PackagePlus, Pencil, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  costPrice: 0,
  sellingPrice: 0,
  taxRate: 0,
  openingStock: 0,
  lowStockAlert: 10,
  categoryId: "",
  brandId: "",
  unitId: "",
  expiryDate: "",
};

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adjustment, setAdjustment] = useState({ action: "STOCK_IN", quantity: 1, reason: "" });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function jsonFetch(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function load() {
    setLoading(true);
    try {
      const [productData, categoryData, brandData, unitData, summaryData] = await Promise.all([
        jsonFetch("/api/products"),
        jsonFetch("/api/categories"),
        jsonFetch("/api/brands"),
        jsonFetch("/api/units"),
        jsonFetch("/api/inventory/summary"),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setBrands(brandData);
      setUnits(unitData);
      setSummary(summaryData);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      description: product.description || "",
      costPrice: Number(product.costPrice || 0),
      sellingPrice: Number(product.sellingPrice || 0),
      taxRate: Number(product.taxRate || 0),
      openingStock: 0,
      lowStockAlert: Number(product.lowStockAlert || 0),
      categoryId: product.categoryId || "",
      brandId: product.brandId || "",
      unitId: product.unitId || "",
      expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().slice(0, 10) : "",
    });
    setShowForm(true);
  }

  async function saveProduct(event) {
    event.preventDefault();
    try {
      if (editing) {
        await jsonFetch(`/api/products/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        setMessage("Product updated successfully.");
      } else {
        await jsonFetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, sku: form.sku || generateSKU(form.name) }),
        });
        setMessage("Product created successfully.");
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Deactivate ${product.name}?`)) return;
    try {
      await jsonFetch(`/api/products/${product.id}`, { method: "DELETE" });
      setMessage("Product deactivated successfully.");
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveAdjustment(event) {
    event.preventDefault();
    try {
      const result = await jsonFetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: adjusting.id, ...adjustment }),
      });
      setMessage(`Stock updated: ${result.previousQuantity} → ${result.quantity}`);
      setAdjusting(null);
      setAdjustment({ action: "STOCK_IN", quantity: 1, reason: "" });
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const quantity = Number(product.stock?.quantity || 0);
      const low = quantity > 0 && quantity <= Number(product.lowStockAlert || 0);
      const out = quantity <= 0;
      const expiry = product.expiryDate ? new Date(product.expiryDate) : null;
      const today = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      const expired = expiry && expiry < today;
      const expiring = expiry && expiry >= today && expiry <= soon;

      const matchesStatus =
        status === "ALL" ||
        (status === "LOW" && low) ||
        (status === "OUT" && out) ||
        (status === "EXPIRY" && (expired || expiring));

      const matchesSearch = !q || `${product.name} ${product.sku} ${product.barcode || ""} ${product.category?.name || ""} ${product.brand?.name || ""}`.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [products, search, status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Products, stock levels, adjustments, reorder alerts and expiry tracking.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 border border-border px-3 py-2 rounded-md text-sm">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3 text-sm">
          <span>{message}</span>
          <button onClick={() => setMessage("")}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          ["Products", summary?.totals.products ?? 0],
          ["Units", summary?.totals.units ?? 0],
          ["Low Stock", summary?.totals.lowStock ?? 0],
          ["Out of Stock", summary?.totals.outOfStock ?? 0],
          ["Expired", summary?.totals.expired ?? 0],
          ["Expiring ≤30d", summary?.totals.expiringSoon ?? 0],
        ].map(([label, value]) => (
          <button key={label} onClick={() => label === "Low Stock" ? setStatus("LOW") : label === "Out of Stock" ? setStatus("OUT") : label.includes("Expiring") || label === "Expired" ? setStatus("EXPIRY") : setStatus("ALL")} className="text-left bg-card border border-border rounded-lg p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-bold mt-1">{value}</div>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, barcode, category or brand..." className="flex-1 border border-border rounded-md px-3 py-2 bg-background" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background">
          <option value="ALL">All Stock</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">Out of Stock</option>
          <option value="EXPIRY">Expiry Alerts</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">SKU / Barcode</th>
              <th className="p-3">Category</th>
              <th className="p-3">Cost</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="p-6 text-center text-muted-foreground">Loading inventory...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-muted-foreground">No products found.</td></tr>
            ) : filteredProducts.map((product) => {
              const quantity = Number(product.stock?.quantity || 0);
              const low = quantity > 0 && quantity <= Number(product.lowStockAlert || 0);
              const out = quantity <= 0;
              const expiry = product.expiryDate ? new Date(product.expiryDate) : null;
              const expired = expiry && expiry < new Date();
              return (
                <tr key={product.id} className="border-t border-border">
                  <td className="p-3 font-medium">{product.name}</td>
                  <td className="p-3"><div>{product.sku}</div><div className="text-xs text-muted-foreground">{product.barcode || "No barcode"}</div></td>
                  <td className="p-3">{product.category?.name || "-"}</td>
                  <td className="p-3">{formatCurrency(product.costPrice)}</td>
                  <td className="p-3">{formatCurrency(product.sellingPrice)}</td>
                  <td className={`p-3 font-semibold ${out || low ? "text-destructive" : ""}`}>
                    {quantity} {out ? "(OUT)" : low ? "(LOW)" : ""}
                  </td>
                  <td className={`p-3 ${expired ? "text-destructive font-semibold" : ""}`}>
                    {expiry ? expiry.toLocaleDateString() : "-"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button title="Stock adjustment" onClick={() => setAdjusting(product)} className="inline-flex items-center gap-1 text-xs underline"><PackagePlus size={14} /> Adjust</button>
                      <button title="Edit product" onClick={() => openEdit(product)} className="inline-flex items-center gap-1 text-xs underline"><Pencil size={14} /> Edit</button>
                      <button title="Deactivate product" onClick={() => deleteProduct(product)} className="inline-flex items-center gap-1 text-xs text-destructive underline"><Trash2 size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl my-8">
            <div className="flex justify-between items-center mb-4">
              <div><h2 className="font-bold text-lg">{editing ? "Edit Product" : "Add Product"}</h2><p className="text-xs text-muted-foreground">Stock changes are recorded through the stock adjustment workflow.</p></div>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={saveProduct} className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <input required placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
                <input placeholder="SKU (auto-generated if blank)" value={form.sku} disabled={Boolean(editing)} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background disabled:opacity-60" />
                <input placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
                <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              </div>
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background" rows="2" />
              <div className="grid md:grid-cols-3 gap-3">
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="border border-border rounded-md px-3 py-2 bg-background"><option value="">Category</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                <select value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })} className="border border-border rounded-md px-3 py-2 bg-background"><option value="">Brand</option>{brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })} className="border border-border rounded-md px-3 py-2 bg-background"><option value="">Unit</option>{units.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              </div>
              <div className="grid md:grid-cols-4 gap-3">
                <input type="number" min="0" step="0.01" placeholder="Cost price" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} className="border border-border rounded-md px-3 py-2 bg-background" />
                <input type="number" min="0" step="0.01" placeholder="Selling price" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })} className="border border-border rounded-md px-3 py-2 bg-background" />
                <input type="number" min="0" max="100" step="0.01" placeholder="Tax %" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} className="border border-border rounded-md px-3 py-2 bg-background" />
                <input type="number" min="0" placeholder="Low stock alert" value={form.lowStockAlert} onChange={(e) => setForm({ ...form, lowStockAlert: Number(e.target.value) })} className="border border-border rounded-md px-3 py-2 bg-background" />
              </div>
              {!editing && <input type="number" min="0" placeholder="Opening stock" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />}
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">{editing ? "Update Product" : "Save Product"}</button>
            </form>
          </div>
        </div>
      )}

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div><h2 className="font-bold text-lg">Stock Adjustment</h2><p className="text-sm text-muted-foreground">{adjusting.name} · Current: {adjusting.stock?.quantity ?? 0}</p></div>
              <button onClick={() => setAdjusting(null)}><X size={18} /></button>
            </div>
            <form onSubmit={saveAdjustment} className="space-y-3">
              <select value={adjustment.action} onChange={(e) => setAdjustment({ ...adjustment, action: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background">
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
              </select>
              <input required type="number" min="1" value={adjustment.quantity} onChange={(e) => setAdjustment({ ...adjustment, quantity: Number(e.target.value) })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input required placeholder="Reason (e.g. damaged, physical count, opening correction)" value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm flex gap-2"><AlertTriangle size={16} /> Every adjustment creates an inventory ledger entry and audit log.</div>
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">Apply Adjustment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
