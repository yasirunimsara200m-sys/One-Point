"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { api, API_URL } from "@/lib/api";
import { lkr } from "@/lib/money";

type Report = {
  day?: string;
  saleCount: number;
  revenue: number;
  profit: number;
  payments: { cash: number; card: number; credit: number };
  topItems: { name: string; qty: number; revenue: number }[];
};
type Product = {
  id: string;
  name: string;
  stockQty: number;
  lowStockThreshold: number;
  sku: string;
};

export default function OwnerHome() {
  const [report, setReport] = useState<Report | null>(null);
  const [low, setLow] = useState<Product[]>([]);
  const [pulse, setPulse] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [r, l] = await Promise.all([
        api<Report>("/api/reports/today"),
        api<Product[]>("/api/products/low-stock"),
      ]);
      setReport(r);
      setLow(l);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    refresh();
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socket.on("sale:created", (payload: { invoiceNo: string; total: number }) => {
      setPulse(`${payload.invoiceNo} · ${lkr(payload.total)}`);
      refresh();
    });

    // Auto-refresh fallback every 10s (works seamlessly on Vercel/serverless)
    const interval = setInterval(refresh, 10000);

    return () => {
      socket.close();
      clearInterval(interval);
    };
  }, []);

  if (error) return <p className="text-red-300">{error}</p>;
  if (!report) return <p>Loading live figures…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Today</h1>
        <p className="text-sm text-paper-200/60">{report.day || "Colombo day"}</p>
        {pulse && (
          <p className="mt-1 text-xs text-teal-300">Live sale: {pulse}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sales" value={lkr(report.revenue)} sub={`${report.saleCount} bills`} />
        <Stat label="Profit" value={lkr(report.profit)} sub="After item cost" />
      </div>
      <div className="rounded-xl border border-white/10 bg-ink-900 p-4">
        <h2 className="text-sm text-paper-200/70">Payment mix</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Pay k="Cash" v={report.payments.cash} />
          <Pay k="Card" v={report.payments.card} />
          <Pay k="Credit" v={report.payments.credit} />
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-ink-900 p-4">
        <h2 className="font-display">Top items</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {report.topItems.length === 0 && (
            <li className="text-paper-200/50">No sales yet today.</li>
          )}
          {report.topItems.map((i) => (
            <li key={i.name} className="flex justify-between">
              <span>
                {i.name}{" "}
                <span className="text-paper-200/50">× {i.qty}</span>
              </span>
              <span>{lkr(i.revenue)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4">
        <h2 className="font-display text-amber-200">Low stock</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {low.length === 0 && <li>All tracked items are healthy.</li>}
          {low.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.name}</span>
              <span>
                {p.stockQty} / min {p.lowStockThreshold}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900 p-4">
      <p className="text-xs uppercase tracking-wide text-paper-200/50">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      <p className="text-xs text-paper-200/50">{sub}</p>
    </div>
  );
}

function Pay({ k, v }: { k: string; v: number }) {
  return (
    <div>
      <p className="text-xs text-paper-200/50">{k}</p>
      <p className="font-medium">{lkr(v)}</p>
    </div>
  );
}
