"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [selected, setSelected] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [payment, setPayment] = useState({ amount: "", method: "CASH", note: "" });

  async function load() { const response = await fetch("/api/customers"); if (response.ok) setRows(await response.json()); }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Unable to create customer");
    setForm({ name: "", phone: "", email: "", address: "" }); load();
  }

  async function viewLedger(customer) {
    setSelected(customer);
    const response = await fetch(`/api/ledgers/customer/${customer.id}`);
    const data = await response.json();
    if (response.ok) setLedger(data); else alert(data.error || "Unable to load ledger");
  }

  async function addPayment() {
    if (!selected || !payment.amount) return;
    const response = await fetch("/api/customer-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId: selected.id, ...payment, amount: Number(payment.amount) }) });
    const data = await response.json();
    if (!response.ok) return alert(data.error || "Unable to record payment");
    setPayment({ amount: "", method: "CASH", note: "" }); load(); viewLedger(selected);
  }

  const totalOutstanding = rows.reduce((sum, row) => sum + Number(row.outstanding || 0), 0);

  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">Customers</h1><p className="text-sm text-muted-foreground">Customer master data, receivables and payment ledger.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Customers</p><p className="text-xl font-bold">{rows.length}</p></div><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Customers With Credit</p><p className="text-xl font-bold">{rows.filter(x=>Number(x.outstanding)>0).length}</p></div><div className="bg-card border rounded-lg p-4"><p className="text-xs text-muted-foreground">Outstanding Receivables</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p></div></div>
    <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-card border rounded-lg p-4"><input required placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><input placeholder="Phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><input placeholder="Address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><button className="bg-primary text-primary-foreground rounded-md px-3 py-2"><Plus size={16} className="inline mr-1"/>Add Customer</button></form>
    <div className="bg-card border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Email</th><th className="p-3 text-right">Sales</th><th className="p-3 text-right">Outstanding</th><th className="p-3">Ledger</th></tr></thead><tbody>{rows.map(x=><tr key={x.id} className="border-t"><td className="p-3">{x.name}</td><td className="p-3">{x.phone||"-"}</td><td className="p-3">{x.email||"-"}</td><td className="p-3 text-right">{x._count?.sales||0}</td><td className="p-3 text-right">{formatCurrency(x.outstanding)}</td><td className="p-3 text-center"><button className="underline" onClick={()=>viewLedger(x)}>View Ledger</button></td></tr>)}</tbody></table></div>
    {selected && <div className="bg-card border rounded-lg p-4 space-y-4"><div className="flex justify-between"><div><h2 className="font-semibold">Customer Ledger — {selected.name}</h2>{ledger?.summary&&<p className="text-sm text-muted-foreground">Outstanding: {formatCurrency(ledger.summary.outstanding)}</p>}</div><button onClick={()=>{setSelected(null);setLedger(null)}} className="underline text-sm">Close</button></div><div className="flex gap-2 flex-wrap"><input type="number" min="0.01" step="0.01" max={ledger?.summary?.outstanding||undefined} placeholder="Payment amount" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><select value={payment.method} onChange={e=>setPayment({...payment,method:e.target.value})} className="border rounded-md px-3 py-2 bg-background"><option>CASH</option><option>CARD</option><option>BANK_TRANSFER</option></select><input placeholder="Note" value={payment.note} onChange={e=>setPayment({...payment,note:e.target.value})} className="border rounded-md px-3 py-2 bg-background"/><button onClick={addPayment} disabled={!ledger?.summary?.outstanding} className="bg-primary text-primary-foreground rounded-md px-4 disabled:opacity-50">Record Payment</button></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-2 text-left">Date</th><th className="p-2">Reference</th><th className="p-2">Description</th><th className="p-2">Debit</th><th className="p-2">Credit</th><th className="p-2">Balance</th></tr></thead><tbody>{(ledger?.rows||[]).map((x,i)=><tr key={i} className="border-t"><td className="p-2">{new Date(x.date).toLocaleDateString()}</td><td className="p-2">{x.reference}</td><td className="p-2">{x.description}</td><td className="p-2 text-right">{formatCurrency(x.debit)}</td><td className="p-2 text-right">{formatCurrency(x.credit)}</td><td className="p-2 text-right">{formatCurrency(x.balance)}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
