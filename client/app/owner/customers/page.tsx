"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";

type Customer = {
  id: string;
  name: string;
  phone: string;
  creditBalance: number;
  notes?: string | null;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [settle, setSettle] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Customer[]>("/api/customers"));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/customers", {
        method: "POST",
        body: JSON.stringify({ name, phone }),
      });
      setName("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function pay(id: string) {
    const amount = Number(settle[id] || 0);
    if (!amount) return;
    try {
      await api(`/api/customers/${id}/settle`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      setSettle({ ...settle, [id]: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Credit customers</h1>
      <form onSubmit={create} className="space-y-2 rounded-xl border border-white/10 bg-ink-900 p-4">
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Name" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Phone 07…" value={phone}
          onChange={(e) => setPhone(e.target.value)} required />
        <button className="w-full rounded-lg bg-brass-500 py-2 text-ink-950">Add customer</button>
      </form>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border border-white/10 bg-ink-900 p-3">
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-paper-200/50">{c.phone}</p>
            <p className="mt-1 text-sm">Outstanding {lkr(c.creditBalance)}</p>
            {c.creditBalance > 0 && (
              <div className="mt-2 flex gap-2">
                <input
                  type="number"
                  className="flex-1 rounded bg-ink-950 px-2 py-1"
                  placeholder="Settle amount"
                  value={settle[c.id] || ""}
                  onChange={(e) => setSettle({ ...settle, [c.id]: e.target.value })}
                />
                <button className="rounded bg-white/10 px-3" onClick={() => pay(c.id)}>
                  Receive
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
