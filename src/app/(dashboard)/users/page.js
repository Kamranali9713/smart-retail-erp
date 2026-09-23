"use client";
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", roleId: "" });

  function load() {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
    fetch("/api/roles").then((r) => r.json()).then(setRoles);
  }
  useEffect(load, []);

  async function addUser(e) {
    e.preventDefault();
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm({ name: "", email: "", password: "", roleId: "" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium">
          <Plus size={16} /> Add User
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Add User</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addUser} className="space-y-3">
              <input required placeholder="Full name" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input required type="email" placeholder="Email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <input required type="password" placeholder="Password" value={form.password} onChange={(e)=>setForm({...form,password:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />
              <select required value={form.roleId} onChange={(e)=>setForm({...form,roleId:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background">
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <button className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium">Create User</button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last Login</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role?.label}</td>
                <td className="p-3">{u.isActive ? "Active" : "Inactive"}</td>
                <td className="p-3">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
