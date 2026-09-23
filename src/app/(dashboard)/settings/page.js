"use client";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  }, []);

  async function save(e) {
    e.preventDefault();
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <form onSubmit={save} className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Store Settings</h2>
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Store name" value={settings.storeName} onChange={(e)=>setSettings({...settings,storeName:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background" />
          <input placeholder="Phone" value={settings.phone||""} onChange={(e)=>setSettings({...settings,phone:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background" />
          <input placeholder="Email" value={settings.email||""} onChange={(e)=>setSettings({...settings,email:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background" />
          <input placeholder="Default tax %" type="number" value={settings.defaultTaxRate} onChange={(e)=>setSettings({...settings,defaultTaxRate:Number(e.target.value)})} className="border border-border rounded-md px-3 py-2 bg-background" />
        </div>
        <input placeholder="Address" value={settings.address||""} onChange={(e)=>setSettings({...settings,address:e.target.value})} className="w-full border border-border rounded-md px-3 py-2 bg-background" />

        <h2 className="font-semibold pt-2">POS Settings</h2>
        <div className="grid grid-cols-2 gap-3">
          <select value={settings.receiptWidth} onChange={(e)=>setSettings({...settings,receiptWidth:e.target.value})} className="border border-border rounded-md px-3 py-2 bg-background">
            <option value="58mm">58mm Thermal</option>
            <option value="80mm">80mm Thermal</option>
          </select>
          <input placeholder="Low stock threshold" type="number" value={settings.lowStockThreshold} onChange={(e)=>setSettings({...settings,lowStockThreshold:Number(e.target.value)})} className="border border-border rounded-md px-3 py-2 bg-background" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.autoBarcode} onChange={(e)=>setSettings({...settings,autoBarcode:e.target.checked})} />
          Auto-generate barcode for new products
        </label>

        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium">
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
