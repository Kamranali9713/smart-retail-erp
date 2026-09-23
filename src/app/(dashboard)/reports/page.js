"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { FileDown, FileSpreadsheet } from "lucide-react";

export default function ReportsPage() {
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    fetch("/api/sales").then((r) => r.json()).then(setSales);
  }, []);

  const filtered = sales.filter((s) => {
    const d = new Date(s.createdAt);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + "T23:59:59")) return false;
    return true;
  });

  const total = filtered.reduce((acc, s) => acc + Number(s.totalAmount), 0);

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.text("Sales Report", 14, 15);
    doc.autoTable({
      startY: 20,
      head: [["Invoice", "Customer", "Payment", "Status", "Total"]],
      body: filtered.map((s) => [
        s.invoiceNo,
        s.customer?.name || "Walk-in",
        s.paymentMethod,
        s.status,
        formatCurrency(s.totalAmount),
      ]),
    });
    doc.save("sales-report.pdf");
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((s) => ({
        Invoice: s.invoiceNo,
        Customer: s.customer?.name || "Walk-in",
        Payment: s.paymentMethod,
        Status: s.status,
        Total: Number(s.totalAmount),
        Date: new Date(s.createdAt).toLocaleString(),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, "sales-report.xlsx");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border border-border rounded-md px-3 py-2 bg-background" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border border-border rounded-md px-3 py-2 bg-background" />
        </div>
        <button onClick={exportPDF} className="flex items-center gap-1 border border-border rounded-md px-3 py-2 text-sm hover:bg-secondary">
          <FileDown size={16} /> Export PDF
        </button>
        <button onClick={exportExcel} className="flex items-center gap-1 border border-border rounded-md px-3 py-2 text-sm hover:bg-secondary">
          <FileSpreadsheet size={16} /> Export Excel
        </button>
        <div className="ml-auto text-sm font-semibold">Total: {formatCurrency(total)}</div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr><th className="p-3">Invoice</th><th className="p-3">Customer</th><th className="p-3">Payment</th><th className="p-3">Status</th><th className="p-3">Total</th><th className="p-3">Date</th></tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3">{s.invoiceNo}</td>
                <td className="p-3">{s.customer?.name || "Walk-in"}</td>
                <td className="p-3">{s.paymentMethod}</td>
                <td className="p-3">{s.status}</td>
                <td className="p-3">{formatCurrency(s.totalAmount)}</td>
                <td className="p-3">{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
