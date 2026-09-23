"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-500">The page could not be loaded. Your data has not been intentionally changed.</p>
          <button onClick={() => reset()} className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">Try again</button>
        </div>
      </body>
    </html>
  );
}
