"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", email: "", address: "" });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [payment, setPayment] = useState({ amount: "", method: "CASH", note: "" });

  function load() {
    fetch("/api/vendors").then((r) => r.json()).then(setVendors);
  }
  useEffect(load, []);

  async function addVendor(e) {
    e.preventDefault();
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", contact: "", email: "", address: "" });
    load();
  }

  async function viewLedger(vendor) { setSelectedVendor(vendor); setLedger(await fetch(`/api/ledgers/vendor/${vendor.id}`).then(r => r.json())); }

  async function addPayment() {
    if (!selectedVendor || !payment.amount) return;
    const r = await fetch("/api/vendor-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: selectedVendor.id, ...payment, amount: Number(payment.amount) }) });
    const data = await r.json(); if (!r.ok) return alert(data.error);
    setPayment({ amount: "", method: "CASH", note: "" }); load(); viewLedger(selectedVendor);
  }

  const totalOutstanding = vendors.reduce((acc, v) => {
    const totalPurchase = v.purchases.reduce((a, p) => a + Number(p.totalAmount), 0);
    const totalPaid = v.payments.reduce((a, p) => a + Number(p.amount), 0);
    return acc + Math.max(0, totalPurchase - totalPaid);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Vendors</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Vendors</p><p className="text-xl font-bold">{vendors.length}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Active Vendors</p><p className="text-xl font-bold">{vendors.filter(v=>v.status==='ACTIVE').length}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Outstanding Payments</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Add Vendor</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addVendor} className="space-y-3">
              <input required placeholder="Vendor name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input placeholder="Contact number" value={form.contact} onChange={(e)=>setForm({...form,contact:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input placeholder="Address" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">Save Vendor</button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Contact</th><th className="p-3">Status</th><th className="p-3">Purchases</th><th className="p-3">Ledger</th></tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="p-3">{v.name}</td>
                <td className="p-3">{v.contact || v.email || "-"}</td>
                <td className="p-3">{v.status}</td>
                <td className="p-3">{v.purchases.length}</td><td className="p-3"><button className="underline" onClick={() => viewLedger(v)}>View Ledger</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedVendor && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex justify-between"><h2 className="font-semibold">Vendor Ledger — {selectedVendor.name}</h2><button onClick={() => setSelectedVendor(null)} className="underline text-sm">Close</button></div>
          <div className="flex gap-2 flex-wrap">
            <input type="number" step="0.01" placeholder="Payment amount" value={payment.amount} onChange={e => setPayment({...payment, amount:e.target.value})} className="border rounded-md px-3 py-2 bg-background" />
            <select value={payment.method} onChange={e => setPayment({...payment, method:e.target.value})} className="border rounded-md px-3 py-2 bg-background"><option>CASH</option><option>CARD</option><option>BANK_TRANSFER</option></select>
            <input placeholder="Note" value={payment.note} onChange={e => setPayment({...payment, note:e.target.value})} className="border rounded-md px-3 py-2 bg-background" />
            <button onClick={addPayment} className="bg-primary text-primary-foreground rounded-md px-4">Record Payment</button>
          </div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-2 text-left">Date</th><th className="p-2">Reference</th><th className="p-2">Debit</th><th className="p-2">Credit</th><th className="p-2">Balance</th></tr></thead><tbody>{ledger.map((x,i)=><tr key={i} className="border-t"><td className="p-2">{new Date(x.date).toLocaleDateString()}</td><td className="p-2">{x.reference}</td><td className="p-2">{formatCurrency(x.debit)}</td><td className="p-2">{formatCurrency(x.credit)}</td><td className="p-2">{formatCurrency(x.balance)}</td></tr>)}</tbody></table></div>
        </div>
      )}
    </div>
  );
}
