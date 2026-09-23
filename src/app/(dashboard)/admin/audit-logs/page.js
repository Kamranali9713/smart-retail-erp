"use client";
import { useEffect, useState } from "react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]); const [q, setQ] = useState("");
  const load = () => fetch(`/api/admin/audit-logs?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(setLogs);
  useEffect(load, []);
  return <div className="space-y-4"><div><h1 className="text-2xl font-bold">Audit Logs</h1><p className="text-sm text-muted-foreground">Track administrative and transaction activity.</p></div>
    <div className="flex gap-2"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search action/module" className="border border-border rounded-md px-3 py-2 bg-background"/><button onClick={load} className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Search</button></div>
    <div className="bg-card border border-border rounded-lg overflow-x-auto"><table className="w-full text-sm"><thead className="bg-secondary"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">User</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Module</th><th className="p-3 text-left">Entity</th><th className="p-3 text-left">Details</th></tr></thead><tbody>{logs.map(l=><tr key={l.id} className="border-t border-border"><td className="p-3">{new Date(l.createdAt).toLocaleString()}</td><td className="p-3">{l.user?.name || "-"}</td><td className="p-3">{l.action}</td><td className="p-3">{l.module}</td><td className="p-3 font-mono text-xs">{l.entityId || "-"}</td><td className="p-3 text-xs max-w-sm truncate">{l.metadata ? JSON.stringify(l.metadata) : "-"}</td></tr>)}</tbody></table></div></div>;
}
