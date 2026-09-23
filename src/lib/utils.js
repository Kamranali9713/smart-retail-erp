import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount) {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export function generateInvoiceNo(prefix = "INV") {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 900 + 100);
  return `${prefix}-${ts}${rand}`;
}

export function generateSKU(name = "PRD") {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4) || "PRD";
  return `${clean}-${Math.floor(Math.random() * 90000 + 10000)}`;
}
