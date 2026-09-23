"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", email: "", address: "" });
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [payment, setPayment] = useState({ amount: "", method: "CASH", note: "" });

  async function load() {
    const response = await fetch("/api/vendors");
    if (response.ok) setVendors(await response.json());
  }
  useEffect(() => { load(); }, []);

  async function addVendor(e) {
    e.preventDefault();
    const response = await fetch("/api/vendors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Unable to create vendor");
    setShowForm(false); setForm({ name: "", contact: "", email: "", address: "" }); load();
  }

  async function viewLedger(vendor) {
    setSelectedVendor(vendor);
    const response = await fetch(`/api/ledgers/vendor/${vendor.id}`);
    const data = await response.json();
    if (response.ok) setLedger(data); else alert(data.error || "Unable to load ledger");
  }

  async function addPayment() {
    if (!selectedVendor || !payment.amount) return;
    const response = await fetch("/api/vendor-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId: selectedVendor.id, ...payment, amount: Number(payment.amount) }) });
    const data = await response.json();
    if (!response.ok) return alert(data.error);
    setPayment({ amount: "", method: "CASH", note: "" }); load(); viewLedger(selectedVendor);
  }

  const totalOutstanding = vendors.reduce((sum, vendor) => {
    const purchaseDue = vendor.purchases.filter(p => p.status === "RECEIVED").reduce((a, p) => a + Math.max(0, Number(p.totalAmount) - Number(p.paidAmount)), 0);
    const payments = vendor.payments.reduce((a, p) => a + Number(p.amount), 0);
    return sum + Math.max(0, purchaseDue - payments);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Vendors</h1><p className="text-sm text-muted-foreground">Supplier balances, payable ledger and payments.</p></div><button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium"><Plus size={16}/> Add Vendor</button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Vendors</p><p className="text-xl font-bold">{vendors.length}</p></div><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Active Vendors</p><p className="text-xl font-bold">{vendors.filter(v => v.status === "ACTIVE").length}</p></div><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Outstanding Payables</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></div></div>
      {showForm && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-card border rounded-lg p-6 w-full max-w-md"><div className="flex justify-between mb-4"><h2 className="font-bold text-lg">Add Vendor</h2><button onClick={() => setShowForm(false)}><X size={18}/></button></div><form onSubmit={addVendor} className="space-y-3">{[["name","Vendor name",true],["contact","Contact number",false],["email","Email",false],["address","Address",false]].map(([key,placeholder,required])=><input key={key} required={required} placeholder={placeholder} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full border rounded-md px-3 py-2 bg-background"/>)}<button className="w-full bg-primary text-primary-foreground py-2 rounded-md">Save Vendor</button></form></div></div>}
      <div className="bg-card border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Contact</th><th className="p-3">Status</th><th className="p-3">Purchases</th><th className="p-3 text-right">Outstanding</th><th className="p-3">Ledger</th></tr></thead><tbody>{vendors.map(v=>{const due=v.purchases.filter(p=>p.status==='RECEIVED').reduce((a,p)=>a+Math.max(0,Number(p.totalAmount)-Number(p.paidAmount)),0);const paid=v.payments.reduce((a,p)=>a+Number(p.amount),0);const outstanding=Math.max(0,due-paid);return <tr key={v.id} className="border-t"><td className="p-3">{v.name}</td><td className="p-3">{v.contact||v.email||'-'}</td><td className="p-3">{v.status}</td><td className="p-3 text-center">{v.purchases.filter(p=>p.status==='RECEIVED').length}</td><td className="p-3 text-right">{formatCurrency(outstanding)}</td><td className="p-3 text-center"><button className="underline" onClick={()=>viewLedger(v)}>View Ledger</button></td></tr>})}</tbody></table></div>
      {selectedVendor && <div className="bg-card border rounded-lg p-4 space-y-4"><div className="flex justify-between"><div><h2 className="font-semibold">Vendor Ledger — {selectedVendor.name}</h2>{ledger?.summary&&<p className="text-sm text-muted-foreground">Outstanding: {formatCurrency(ledger.summary.outstanding)}</p>}</div><button onClick={()=>{setSelectedVendor(null);setLedger(null)}} className="underline text-sm">Close</button></div><div className="flex gap-2 flex-wrap"><input type="number" min="0.01" step="0.01" max={ledger?.summary?.outstanding||undefined} placeholder="Payment amount" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><select value={payment.method} onChange={e=>setPayment({...payment,method:e.target.value})} className="border rounded-md px-3 py-2 bg-background"><option>CASH</option><option>CARD</option><option>BANK_TRANSFER</option></select><input placeholder="Note" value={payment.note} onChange={e=>setPayment({...payment,note:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><button onClick={addPayment} disabled={!ledger?.summary?.outstanding} className="bg-primary text-primary-foreground rounded-md px-4 disabled:opacity-50">Record Payment</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-2 text-left">Date</th><th className="p-2">Reference</th><th className="p-2">Debit</th><th className="p-2">Credit</th><th className="p-2">Balance</th></tr></thead><tbody>{(ledger?.rows||[]).map((x,i)=><tr key={i} className="border-t"><td className="p-2">{new Date(x.date).toLocaleDateString()}</td><td className="p-2">{x.reference}</td><td className="p-2 text-right">{formatCurrency(x.debit)}</td><td className="p-2 text-right">{formatCurrency(x.credit)}</td><td className="p-2 text-right">{formatCurrency(x.balance)}</td></tr>)}</tbody></table></div></div>}
    </div>
  );
}
