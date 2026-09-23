"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

export default function AccountingPage() {
  const [pnl, setPnl] = useState(null);
  const [incomeForm, setIncomeForm] = useState({ source: "", amount: 0, note: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: 0, note: "" });
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);

  function load() {
    fetch("/api/accounting/pnl").then((r) => r.json()).then(setPnl);
    fetch("/api/accounting/income").then((r) => r.json()).then(setIncomes);
    fetch("/api/accounting/expenses").then((r) => r.json()).then(setExpenses);
  }
  useEffect(load, []);

  async function addIncome(e) {
    e.preventDefault();
    await fetch("/api/accounting/income", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(incomeForm) });
    setIncomeForm({ source: "", amount: 0, note: "" });
    load();
  }

  async function addExpense(e) {
    e.preventDefault();
    await fetch("/api/accounting/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expenseForm) });
    setExpenseForm({ category: "", amount: 0, note: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Accounting</h1>

      {pnl && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Sales Revenue</p><p className="text-lg font-bold">{formatCurrency(pnl.salesRevenue)}</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Other Income</p><p className="text-lg font-bold">{formatCurrency(pnl.otherIncome)}</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-lg font-bold">{formatCurrency(pnl.totalExpenses ?? pnl.expenses ?? 0)}</p></div>
          <div className="bg-card border border-border rounded-lg p-4"><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-lg font-bold ${pnl.netProfit>=0?"text-green-600":"text-destructive"}`}>{formatCurrency(pnl.netProfit)}</p></div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Add Income</h2>
          <form onSubmit={addIncome} className="space-y-2">
            <input required placeholder="Source" value={incomeForm.source} onChange={(e)=>setIncomeForm({...incomeForm,source:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required type="number" placeholder="Amount" value={incomeForm.amount} onChange={(e)=>setIncomeForm({...incomeForm,amount:Number(e.target.value)})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input placeholder="Note" value={incomeForm.note} onChange={(e)=>setIncomeForm({...incomeForm,note:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Add Income</button>
          </form>
          <ul className="mt-3 text-sm space-y-1 max-h-40 overflow-y-auto">
            {incomes.map((i) => <li key={i.id} className="flex justify-between border-b border-border/50 py-1"><span>{i.source}</span><span>{formatCurrency(i.amount)}</span></li>)}
          </ul>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Add Expense</h2>
          <form onSubmit={addExpense} className="space-y-2">
            <input required placeholder="Category" value={expenseForm.category} onChange={(e)=>setExpenseForm({...expenseForm,category:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input required type="number" placeholder="Amount" value={expenseForm.amount} onChange={(e)=>setExpenseForm({...expenseForm,amount:Number(e.target.value)})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <input placeholder="Note" value={expenseForm.note} onChange={(e)=>setExpenseForm({...expenseForm,note:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium">Add Expense</button>
          </form>
          <ul className="mt-3 text-sm space-y-1 max-h-40 overflow-y-auto">
            {expenses.map((i) => <li key={i.id} className="flex justify-between border-b border-border/50 py-1"><span>{i.category}</span><span>{formatCurrency(i.amount)}</span></li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
