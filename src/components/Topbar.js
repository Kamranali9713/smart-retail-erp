"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Moon, Sun, LogOut } from "lucide-react";

export default function Topbar() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card flex items-center justify-end gap-2 px-4">
      <button
        onClick={toggleTheme}
        className="p-2 rounded-md hover:bg-secondary"
        title="Toggle theme"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="p-2 rounded-md hover:bg-secondary flex items-center gap-1 text-sm"
      >
        <LogOut size={16} /> Sign out
      </button>
    </header>
  );
}
