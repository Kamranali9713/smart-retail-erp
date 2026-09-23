"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

function today() { return new Date().toISOString().slice(0, 10); }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }

const REF_TYPES = ["SALE", "SALE_RETURN", "PURCHASE", "EXPENSE", "INCOME", "VENDOR_PAYMENT", "MANUAL"];

export default function AccountingLedgerPage() {
  const [accounts, setAccounts] = useState([]);
  const [data, setData] = useState({ rows: [], accountSummaries: [], totals: { debit: 0, credit: 0 } });
  const [filters, setFilters] = useState({ accountId: "", refType: "", search: "", from: monthStart(), to: today() });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [journal, setJournal] = useState({ description: "", debitAccountId: "", creditAccountId: "", amount: "" });
  const [journalMessage, setJournalMessage] = useState("");

  async function loadAccounts() {
    const response = await fetch("/api/accounting/accounts", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error || "Unable to load accounts");
    setAccounts(json);
  }

  async function loadLedger() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
      const response = await fetch(`/api/accounting/ledger?${params.toString()}`, { cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to load ledger");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAccounts().catch((e) => setError(e.message)); }, []);
  useEffect(() => { loadLedger(); }, []);

  const selectedAccount = useMemo(() => accounts.find((a) => a.id === filters.accountId), [accounts, filters.accountId]);

  function updateFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); }

  function reset() { setFilters({ accountId: "", refType: "", search: "", from: monthStart(), to: today() }); setTimeout(loadLedger, 0); }

  async function postJournal() {
    setJournalMessage("");
    const amount = Number(journal.amount);
    if (!journal.debitAccountId || !journal.creditAccountId || journal.debitAccountId === journal.creditAccountId || !Number.isFinite(amount) || amount <= 0) {
      setJournalMessage("Select two different accounts and enter a positive amount.");
      return;
    }
    try {
      const response = await fetch("/api/accounting/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: journal.description, entries: [{ accountId: journal.debitAccountId, type: "DEBIT", amount }, { accountId: journal.creditAccountId, type: "CREDIT", amount }] }) });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Unable to post journal entry");
      setJournal({ description: "", debitAccountId: "", creditAccountId: "", amount: "" });
      setJournalMessage("Journal entry posted successfully.");
      loadLedger();
    } catch (e) { setJournalMessage(e.message); }
  }

  function exportCsv() {
    const headers = ["Date", "Account", "Type", "Debit", "Credit", "Balance", "Reference Type", "Reference", "Description"];
    const lines = data.rows.map((row) => [
      new Date(row.createdAt).toLocaleString(), row.account?.name || "", row.type,
      row.debit.toFixed(2), row.credit.toFixed(2), row.balance.toFixed(2), row.refType || "", row.refId || "", row.description || "",
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `accounting-ledger-${today()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Accounting Ledger</h1><p className="text-sm text-muted-foreground">Complete double-entry transaction ledger with running balances.</p></div>
        <div className="flex gap-2"><button onClick={exportCsv} disabled={!data.rows.length} className="px-4 py-2 rounded-md border border-border text-sm font-medium disabled:opacity-50">Export CSV</button><button onClick={loadLedger} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Refresh</button></div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 grid md:grid-cols-6 gap-3">
        <select value={filters.accountId} onChange={(e) => updateFilter("accountId", e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background">
          <option value="">All accounts</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.type}</option>)}
        </select>
        <select value={filters.refType} onChange={(e) => updateFilter("refType", e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background">
          <option value="">All references</option>{REF_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input value={filters.search} onChange={(e) => updateFilter("search", e.target.value)} placeholder="Search description/reference" className="border border-border rounded-md px-3 py-2 bg-background" />
        <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background" />
        <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} className="border border-border rounded-md px-3 py-2 bg-background" />
        <div className="flex gap-2"><button onClick={loadLedger} className="flex-1 px-3 py-2 rounded-md border border-border text-sm font-medium">Apply</button><button onClick={reset} className="px-3 py-2 rounded-md border border-border text-sm">Reset</button></div>
      </div>

      {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-3 text-sm">{error}</div>}

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div><h2 className="font-semibold">Manual Journal Entry</h2><p className="text-xs text-muted-foreground">Post a balanced debit and credit entry directly to the general ledger.</p></div>
        <div className="grid md:grid-cols-4 gap-3">
          <input value={journal.description} onChange={(e)=>setJournal({...journal,description:e.target.value})} placeholder="Description" className="border border-border rounded-md px-3 py-2 bg-background" />
          <select value={journal.debitAccountId} onChange={(e)=>setJournal({...journal,debitAccountId:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background"><option value="">Debit account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.type}</option>)}</select>
          <select value={journal.creditAccountId} onChange={(e)=>setJournal({...journal,creditAccountId:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background"><option value="">Credit account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.type}</option>)}</select>
          <div className="flex gap-2"><input type="number" min="0.01" step="0.01" value={journal.amount} onChange={(e)=>setJournal({...journal,amount:e.target.value})} placeholder="Amount" className="min-w-0 flex-1 border border-border rounded-md px-3 py-2 bg-background" /><button onClick={postJournal} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Post</button></div>
        </div>
        {journalMessage && <div className="text-sm text-muted-foreground">{journalMessage}</div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Opening Balance</p><p className="text-lg font-bold">{selectedAccount ? formatCurrency(data.openingBalance || 0) : "—"}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Debit</p><p className="text-lg font-bold">{formatCurrency(data.totals?.debit || 0)}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Credit</p><p className="text-lg font-bold">{formatCurrency(data.totals?.credit || 0)}</p></div>
        <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Closing Balance</p><p className="text-lg font-bold">{selectedAccount ? formatCurrency(data.closingBalance || 0) : "—"}</p></div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex justify-between"><span className="font-semibold">Ledger Entries</span><span className="text-sm text-muted-foreground">{loading ? "Loading…" : `${data.rows.length} entries${data.hasMore ? " (showing first 500)" : ""}`}</span></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Account</th><th className="p-3 text-left">Reference</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Balance</th></tr></thead>
          <tbody>{data.rows.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3 whitespace-nowrap">{new Date(row.createdAt).toLocaleString()}</td><td className="p-3">{row.account?.name}<div className="text-xs text-muted-foreground">{row.account?.type}</div></td><td className="p-3"><span>{row.refType || "MANUAL"}</span>{row.refId && <div className="text-xs text-muted-foreground truncate max-w-32">{row.refId}</div>}</td><td className="p-3 min-w-48">{row.description || "—"}</td><td className="p-3 text-right">{row.debit ? formatCurrency(row.debit) : "—"}</td><td className="p-3 text-right">{row.credit ? formatCurrency(row.credit) : "—"}</td><td className="p-3 text-right font-medium">{formatCurrency(row.balance)}</td></tr>)}</tbody>
          <tfoot className="bg-secondary font-semibold"><tr><td className="p-3" colSpan="4">Period Totals</td><td className="p-3 text-right">{formatCurrency(data.totals?.debit || 0)}</td><td className="p-3 text-right">{formatCurrency(data.totals?.credit || 0)}</td><td className="p-3 text-right">{selectedAccount ? formatCurrency(data.closingBalance || 0) : "—"}</td></tr></tfoot>
        </table></div>
        {!loading && !data.rows.length && <div className="p-8 text-center text-sm text-muted-foreground">No ledger entries match the selected filters.</div>}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden"><div className="px-4 py-3 border-b border-border font-semibold">Account Summary</div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Account</th><th className="p-3 text-left">Type</th><th className="p-3 text-right">Opening</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th><th className="p-3 text-right">Closing</th></tr></thead><tbody>{data.accountSummaries.map((row) => <tr key={row.id} className="border-t border-border"><td className="p-3">{row.name}</td><td className="p-3">{row.type}</td><td className="p-3 text-right">{formatCurrency(row.openingBalance)}</td><td className="p-3 text-right">{formatCurrency(row.debit)}</td><td className="p-3 text-right">{formatCurrency(row.credit)}</td><td className="p-3 text-right font-medium">{formatCurrency(row.closingBalance)}</td></tr>)}</tbody></table></div></div>
    </div>
  );
}
