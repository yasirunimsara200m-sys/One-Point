"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";

type Sale = {
  id: string;
  invoiceNo: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  cashier?: { name: string };
  items: { name: string; qty: number }[];
};

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Sale[]>("/api/sales")
      .then(setSales)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Today’s bills</h1>
      {error && <p className="text-red-300">{error}</p>}
      <ul className="space-y-2">
        {sales.map((s) => (
          <li key={s.id} className="rounded-xl border border-white/10 bg-ink-900 p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{s.invoiceNo}</span>
              <span>{lkr(s.total)}</span>
            </div>
            <p className="text-xs text-paper-200/50">
              {new Date(s.createdAt).toLocaleTimeString("en-LK")} · {s.paymentMethod} ·{" "}
              {s.cashier?.name}
            </p>
            <p className="mt-1 text-xs text-paper-200/70">
              {s.items.map((i) => `${i.name}×${i.qty}`).join(", ")}
            </p>
          </li>
        ))}
        {sales.length === 0 && <p className="text-paper-200/50">No bills yet.</p>}
      </ul>
    </div>
  );
}
