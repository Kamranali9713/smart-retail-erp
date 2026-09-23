"use client";
import { useEffect, useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Search, Trash2, PauseCircle, PlayCircle, Printer } from "lucide-react";

export default function POSPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // { productId, name, price, taxRate, quantity }
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [heldSales, setHeldSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    loadHeld();
    fetch("/api/customers").then((r) => r.ok ? r.json() : []).then(setCustomers);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim()) {
        fetch(`/api/products?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then(setProducts);
      } else {
        setProducts([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function loadHeld() {
    fetch("/api/sales?status=HELD").then((r) => r.json()).then(setHeldSales);
  }

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === p.id);
      if (existing) {
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
          availableStock: p.stock?.quantity ?? 0,
        },
      ];
    });
    setQuery("");
    setProducts([]);
    searchRef.current?.focus();
  }

  function updateQty(productId, qty) {
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, quantity: Math.max(1, qty) } : c))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }

  const subtotal = cart.reduce((acc, c) => acc + c.price * c.quantity, 0);
  const taxAmount = cart.reduce((acc, c) => acc + (c.taxRate / 100) * c.price * c.quantity, 0);
  const computedDiscount = discountAmount || (subtotal * discountPct) / 100;
  const total = subtotal - computedDiscount + taxAmount;

  async function checkout(status = "COMPLETED") {
    if (cart.length === 0) return;
    if (paymentMethod === "CREDIT" && !customerId) {
      alert("Select a customer before using Credit payment.");
      return;
    }
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map((c) => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.price })),
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
    setCart([]);
    setDiscountPct(0);
    setDiscountAmount(0);
    setCustomerId("");
    setPaymentMethod("CASH");
    loadHeld();
  }

  async function resumeSale(sale) {
    await fetch(`/api/sales/${sale.id}/resume`, { method: "POST" });
    setCart(
      sale.items.map((i) => ({
        productId: i.productId,
        name: i.product.name,
        price: Number(i.unitPrice),
        taxRate: Number(i.product.taxRate),
        quantity: i.quantity,
      }))
    );
    loadHeld();
  }

  function printReceipt() {
    window.print();
  }

  return (
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
                  className="flex items-center gap-1 text-sm border border-border rounded-md px-3 py-1.5 hover:bg-secondary"
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
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span>Discount %</span>
          <input
            type="number"
            value={discountPct}
            onChange={(e) => { setDiscountPct(Number(e.target.value)); setDiscountAmount(0); }}
            className="w-20 border border-border rounded px-2 py-1 bg-background text-right"
          />
        </div>
        <div className="flex justify-between text-sm items-center">
          <span>Discount Amt</span>
          <input
            type="number"
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
          <label className="text-sm font-medium">Customer</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full mt-1 border border-border rounded-md px-3 py-2 bg-background"
          >
            <option value="">Walk-in Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}{Number(customer.outstanding || 0) > 0 ? ` — Due ${formatCurrency(customer.outstanding)}` : ""}
              </option>
            ))}
          </select>
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
            <option value="CREDIT">Credit / Customer Due</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => checkout("HELD")}
            className="flex items-center justify-center gap-1 border border-border rounded-md py-2 text-sm hover:bg-secondary"
          >
            <PauseCircle size={16} /> Hold
          </button>
          <button
            onClick={() => checkout("COMPLETED")}
            className="bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold hover:opacity-90"
          >
            Checkout
          </button>
        </div>

        {lastReceipt && (
          <button
            onClick={printReceipt}
            className="flex items-center justify-center gap-1 border border-border rounded-md py-2 text-sm hover:bg-secondary"
          >
            <Printer size={16} /> Print Last Receipt
          </button>
        )}
      </div>

      {lastReceipt && (
        <div id="receipt-print" className="hidden print:block fixed top-0 left-0 p-4 text-xs">
          <h2 className="font-bold text-center">SMART RETAIL STORE</h2>
          <p className="text-center">Invoice: {lastReceipt.invoiceNo}</p>
          <hr className="my-1" />
          {lastReceipt.items.map((i) => (
            <div key={i.productId} className="flex justify-between">
              <span>{i.name} x{i.quantity}</span>
              <span>{formatCurrency(i.price * i.quantity)}</span>
            </div>
          ))}
          <hr className="my-1" />
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(lastReceipt.discount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(lastReceipt.taxAmount)}</span></div>
          <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(lastReceipt.total)}</span></div>
          <p className="text-center mt-2">Thank you!</p>
        </div>
      )}
    </div>
  );
}
