"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";

type Current = {
  session: null | {
    id: string;
    openingFloat: number;
    openedAt: string;
    openedBy: { name: string };
  };
  expectedCash: number;
  cashSales?: number;
};

type Closed = {
  id: string;
  openingFloat: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  notes?: string | null;
  openedAt: string;
  closedAt: string;
  openedBy: { name: string };
  closedBy?: { name: string } | null;
};

export default function DrawerPage() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<Closed[]>([]);
  const [floatAmt, setFloatAmt] = useState("5000");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [closed, setClosed] = useState<Closed | null>(null);

  async function load() {
    const [c, h] = await Promise.all([
      api<Current>("/api/drawer/current"),
      api<Closed[]>("/api/drawer/history"),
    ]);
    setCurrent(c);
    setHistory(h);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function openDrawer(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/drawer/open", {
        method: "POST",
        body: JSON.stringify({ openingFloat: Number(floatAmt) }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function closeDrawer(e: FormEvent) {
    e.preventDefault();
    try {
      const row = await api<Closed>("/api/drawer/close", {
        method: "POST",
        body: JSON.stringify({ actualCash: Number(counted), notes }),
      });
      setClosed(row);
      setCounted("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Cash drawer</h1>
      {error && <p className="text-red-300 text-sm">{error}</p>}
      {!current?.session && (
        <form onSubmit={openDrawer} className="space-y-2 rounded-xl border border-white/10 bg-ink-900 p-4">
          <p className="text-sm">No session open. Enter opening float.</p>
          <input className="w-full rounded bg-ink-950 px-2 py-2" type="number" value={floatAmt}
            onChange={(e) => setFloatAmt(e.target.value)} />
          <button className="w-full rounded-lg bg-brass-500 py-2 text-ink-950">Open drawer</button>
        </form>
      )}
      {current?.session && (
        <form onSubmit={closeDrawer} className="space-y-2 rounded-xl border border-white/10 bg-ink-900 p-4">
          <p className="text-sm text-paper-200/70">
            Opened by {current.session.openedBy.name} at{" "}
            {new Date(current.session.openedAt).toLocaleString("en-LK")}
          </p>
          <p>Opening float {lkr(current.session.openingFloat)}</p>
          <p>Cash sales {lkr(current.cashSales || 0)}</p>
          <p className="font-display text-xl">Expected {lkr(current.expectedCash)}</p>
          <label className="block text-sm">
            Counted cash
            <input className="mt-1 w-full rounded bg-ink-950 px-2 py-2" type="number" required
              value={counted} onChange={(e) => setCounted(e.target.value)} />
          </label>
          <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Notes"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="w-full rounded-lg bg-brass-500 py-2 text-ink-950">
            Close & reconcile
          </button>
        </form>
      )}
      {closed && (
        <div className="rounded-xl border border-teal-500/40 bg-teal-950/30 p-4">
          <h2 className="font-display">Last close</h2>
          <p>Expected {lkr(closed.expectedCash)}</p>
          <p>Counted {lkr(closed.actualCash)}</p>
          <p className={closed.variance === 0 ? "text-teal-200" : "text-amber-200"}>
            Variance {lkr(closed.variance)}
          </p>
        </div>
      )}
      <h2 className="font-display">History</h2>
      <ul className="space-y-2 text-sm">
        {history.map((h) => (
          <li key={h.id} className="rounded-xl border border-white/10 bg-ink-900 p-3">
            <p>{new Date(h.closedAt).toLocaleString("en-LK")}</p>
            <p>
              Expected {lkr(h.expectedCash)} · Counted {lkr(h.actualCash)} · Var {lkr(h.variance)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
