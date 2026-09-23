"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Search, Trash2, PauseCircle, PlayCircle, Printer, RotateCcw } from "lucide-react";

export default function POSPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [cart, setCart] = useState([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [heldSales, setHeldSales] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [returnSale, setReturnSale] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [busy, setBusy] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    loadHeld();
    loadRecentSales();
    loadCustomers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        fetch(`/api/products?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((data) => setProducts(Array.isArray(data) ? data : []));
      } else {
        setProducts([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function loadHeld() {
    fetch("/api/sales?status=HELD&limit=50")
      .then((r) => r.json())
      .then((data) => setHeldSales(Array.isArray(data) ? data : []));
  }

  function loadRecentSales() {
    fetch("/api/sales?status=COMPLETED&limit=20")
      .then((r) => r.json())
      .then((data) => setRecentSales(Array.isArray(data) ? data : []));
  }

  function loadCustomers() {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => setCustomers(Array.isArray(data) ? data : []));
  }

  function addToCart(p) {
    if (Number(p.stock?.quantity ?? 0) <= 0) {
      alert("This product is out of stock.");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
        if (existing.quantity >= Number(existing.availableStock)) {
          alert("Cannot add more than available stock.");
          return prev;
        }
        return prev.map((c) =>
          c.productId === p.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          price: Number(p.sellingPrice),
          taxRate: Number(p.taxRate),
          quantity: 1,
          availableStock: Number(p.stock?.quantity ?? 0),
        },
      ];
    });
    setQuery("");
    setProducts([]);
    searchRef.current?.focus();
  }

  function updateQty(productId, qty) {
    const item = cart.find((c) => c.productId === productId);
    const nextQty = Math.max(1, Number(qty) || 1);
    if (item && nextQty > item.availableStock) {
      alert(`Only ${item.availableStock} unit(s) are available.`);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, quantity: nextQty } : c))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  function resetCart() {
    setCart([]);
    setCustomerId("");
    setDiscountPct(0);
    setDiscountAmount(0);
    setPaymentMethod("CASH");
  }

  const subtotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0);
  const taxAmount = cart.reduce((acc, c) => acc + (c.taxRate / 100) * c.price * c.quantity, 0);
  const computedDiscount = discountAmount || (subtotal * discountPct) / 100;
  const total = Math.max(0, subtotal - Math.min(computedDiscount, subtotal) + taxAmount);

  async function checkout(status = "COMPLETED") {
    if (cart.length === 0 || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity })),
          discountPct,
          discountAmount,
          paymentMethod,
          customerId: customerId || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Checkout failed");
        return;
      }
      if (status === "COMPLETED") {
        setLastReceipt({ ...data, items: cart, subtotal, taxAmount, discount: computedDiscount, total });
      }
      resetCart();
      loadHeld();
      loadRecentSales();
    } finally {
      setBusy(false);
    }
  }

  async function resumeSale(sale) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${sale.id}/resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Unable to resume sale");
        return;
      }
      setCart(
        data.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          price: Number(i.unitPrice),
          taxRate: Number(i.product.taxRate),
          quantity: i.quantity,
          availableStock: Number(i.quantity) + Number(i.product.stock?.quantity ?? 0),
        }))
      );
      setCustomerId(data.customerId || "");
      loadHeld();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReturn() {
    if (!returnSale || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sales/${returnSale.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: returnReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Return failed");
        return;
      }
      setReturnSale(null);
      setReturnReason("");
      loadRecentSales();
      alert(`Sale ${data.invoiceNo} returned successfully.`);
    } finally {
      setBusy(false);
    }
  }

  function printReceipt() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 h-full">
        <div className="col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU, or scan barcode..."
              className="w-full pl-10 pr-3 py-3 rounded-md border border-border bg-card text-base"
            />
            {products.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-72 overflow-y-auto">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full text-left px-4 py-2 hover:bg-secondary flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {p.sku} · Stock: {p.stock?.quantity ?? 0}
                      </p>
                    </div>
                    <span className="font-semibold">{formatCurrency(p.sellingPrice)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-left">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Total</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Cart is empty — search a product above to begin
                    </td>
                  </tr>
                )}
                {cart.map((c) => (
                  <tr key={c.productId} className="border-t border-border">
                    <td className="p-3">{c.name}</td>
                    <td className="p-3">{formatCurrency(c.price)}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        max={c.availableStock}
                        value={c.quantity}
                        onChange={(e) => updateQty(c.productId, Number(e.target.value))}
                        className="w-16 border border-border rounded px-2 py-1 bg-background"
                      />
                    </td>
                    <td className="p-3">{formatCurrency(c.price * c.quantity)}</td>
                    <td className="p-3">
                      <button onClick={() => removeItem(c.productId)} className="text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {heldSales.length > 0 && (
            <div className="bg-card border border-border rounded-lg p-3">
              <h3 className="font-semibold text-sm mb-2">Held Sales</h3>
              <div className="flex gap-2 flex-wrap">
                {heldSales.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => resumeSale(s)}
                    disabled={busy}
                    className="flex items-center gap-1 text-sm border border-border rounded-md px-3 py-1.5 hover:bg-secondary disabled:opacity-50"
                  >
                    <PlayCircle size={14} /> {s.invoiceNo} · {formatCurrency(s.totalAmount)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 h-fit sticky top-0">
          <h2 className="font-bold text-lg">Order Summary</h2>

          <div>
            <label className="text-sm font-medium">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full mt-1 border border-border rounded-md px-3 py-2 bg-background"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` · ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span>Discount %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) => { setDiscountPct(Number(e.target.value)); setDiscountAmount(0); }}
              className="w-20 border border-border rounded px-2 py-1 bg-background text-right"
            />
          </div>
          <div className="flex justify-between text-sm items-center">
            <span>Discount Amt</span>
            <input
              type="number"
              min={0}
              value={discountAmount}
              onChange={(e) => { setDiscountAmount(Number(e.target.value)); setDiscountPct(0); }}
              className="w-20 border border-border rounded px-2 py-1 bg-background text-right"
            />
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full mt-1 border border-border rounded-md px-3 py-2 bg-background"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => checkout("HELD")}
              disabled={busy || cart.length === 0}
              className="flex items-center justify-center gap-1 border border-border rounded-md py-2 text-sm hover:bg-secondary disabled:opacity-50"
            >
              <PauseCircle size={16} /> Hold
            </button>
            <button
              onClick={() => checkout("COMPLETED")}
              disabled={busy || cart.length === 0}
              className="bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        </div>
      </div>

      {lastReceipt && (
        <div id="receipt-print" className="bg-card border border-border rounded-lg p-4 max-w-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">Receipt</h3>
              <p className="text-xs text-muted-foreground">{lastReceipt.invoiceNo}</p>
            </div>
            <button onClick={printReceipt} className="flex items-center gap-1 border border-border rounded-md px-3 py-1.5 text-sm">
              <Printer size={14} /> Print
            </button>
          </div>
          <div className="text-sm space-y-1">
            {lastReceipt.items.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.name} × {item.quantity}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(lastReceipt.discount)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(lastReceipt.taxAmount)}</span></div>
            <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(lastReceipt.total)}</span></div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-bold">Recent Completed Sales</h2>
          <p className="text-xs text-muted-foreground mt-1">Full completed sales can be returned from here.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Total</th>
                <th className="p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No completed sales found.</td></tr>
              )}
              {recentSales.map((sale) => (
                <tr key={sale.id} className="border-t border-border">
                  <td className="p-3 font-medium">{sale.invoiceNo}</td>
                  <td className="p-3">{sale.customer?.name || "Walk-in"}</td>
                  <td className="p-3">{sale.paymentMethod}</td>
                  <td className="p-3">{formatCurrency(sale.totalAmount)}</td>
                  <td className="p-3">{new Date(sale.createdAt).toLocaleString()}</td>
                  <td className="p-3">
                    <button
                      onClick={() => { setReturnSale(sale); setReturnReason(""); }}
                      disabled={busy}
                      className="flex items-center gap-1 border border-destructive/30 text-destructive rounded-md px-3 py-1.5 text-xs hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <RotateCcw size={14} /> Return
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {returnSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold">Return Sale</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {returnSale.invoiceNo} · {formatCurrency(returnSale.totalAmount)}
            </p>
            <p className="text-sm mt-4">
              This phase supports a complete sale return. All items will be restored to stock and the accounting entries reversed.
            </p>
            <label className="block text-sm font-medium mt-4">Reason</label>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              placeholder="Customer returned the goods..."
              className="w-full mt-1 border border-border rounded-md px-3 py-2 bg-background"
            />
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setReturnSale(null)}
                className="border border-border rounded-md px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmReturn}
                disabled={busy}
                className="bg-destructive text-destructive-foreground rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {busy ? "Processing..." : "Confirm Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
