"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { NAV_ITEMS, sessionHasPermission } from "@/lib/rbac-config";
import { LayoutDashboard, ShoppingCart, Boxes, Truck, Calculator, FileBarChart, Settings, Users, DatabaseBackup, BookOpen, BarChart3, Barcode, ShieldCheck, History, ShoppingBag, UserRound } from "lucide-react";

const ICONS = { "/dashboard": LayoutDashboard, "/pos": ShoppingCart, "/inventory": Boxes, "/inventory/ledger": BookOpen, "/inventory/valuation": BarChart3, "/inventory/barcodes": Barcode, "/purchases": ShoppingBag, "/customers": UserRound, "/vendors": Truck, "/accounting": Calculator, "/accounting/ledger": BookOpen, "/accounting/accounts": Calculator, "/accounting/reports": FileBarChart, "/reports": FileBarChart, "/users": Users, "/settings": Settings, "/admin/audit-logs": ShieldCheck, "/admin/login-history": History, "/admin/backups": DatabaseBackup };

export default function Sidebar() {
  const pathname = usePathname(); const { data: session } = useSession();
  const visible = NAV_ITEMS.filter(item => sessionHasPermission(session, item.module, "view"));
  return <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col"><div className="p-4 border-b border-border"><h1 className="font-bold text-lg leading-tight">Smart Retail</h1><p className="text-xs text-muted-foreground">ERP & POS System</p></div><nav className="flex-1 overflow-y-auto p-2 space-y-1">{visible.map(item=>{const Icon=ICONS[item.href]||Boxes;const active=pathname?.startsWith(item.href);return <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active?"bg-primary text-primary-foreground":"text-foreground/80 hover:bg-secondary"}`}><Icon size={18}/>{item.label}</Link>})}</nav><div className="p-3 border-t border-border text-xs text-muted-foreground">{session?.user?.name} · {session?.user?.role}</div></aside>;
}
