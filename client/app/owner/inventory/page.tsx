"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";

type Category = { id: string; name: string; kind: string };
type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  costPrice: number;
  sellPrice: number;
  trackStock: boolean;
  stockQty: number;
  lowStockThreshold: number;
  quickButton: boolean;
  active: boolean;
  lowStock: boolean;
};

const empty = {
  sku: "",
  barcode: "",
  name: "",
  categoryId: "",
  costPrice: 0,
  sellPrice: 0,
  trackStock: true,
  stockQty: 0,
  lowStockThreshold: 5,
  quickButton: false,
  active: true,
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  async function load() {
    const [p, c] = await Promise.all([
      api<Product[]>(`/api/products?all=1${q ? `&q=${encodeURIComponent(q)}` : ""}`),
      api<Category[]>("/api/categories"),
    ]);
    setProducts(p);
    setCategories(c);
    if (!form.categoryId && c[0]) setForm((f) => ({ ...f, categoryId: c[0].id }));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [q]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      barcode: form.barcode || null,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      stockQty: Number(form.stockQty),
      lowStockThreshold: Number(form.lowStockThreshold),
    };
    try {
      if (editing) {
        await api(`/api/products/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/products", { method: "POST", body: JSON.stringify(payload) });
      }
      setForm({ ...empty, categoryId: categories[0]?.id || "" });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Inventory</h1>
      <input
        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2"
        placeholder="Search stock"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <form onSubmit={save} className="space-y-2 rounded-xl border border-white/10 bg-ink-900 p-4">
        <p className="text-sm text-paper-200/70">{editing ? "Edit item" : "New item"}</p>
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Name" required
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded bg-ink-950 px-2 py-2" placeholder="SKU" required
            value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <input className="rounded bg-ink-950 px-2 py-2" placeholder="Barcode"
            value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        </div>
        <select className="w-full rounded bg-ink-950 px-2 py-2" value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">Cost
            <input type="number" className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
              value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
          </label>
          <label className="text-xs">Sell
            <input type="number" className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
              value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs">Qty
            <input type="number" className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
              value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
          </label>
          <label className="text-xs">Low-stock at
            <input type="number" className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
              value={form.lowStockThreshold}
              onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.trackStock}
            onChange={(e) => setForm({ ...form, trackStock: e.target.checked })} />
          Track stock
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.quickButton}
            onChange={(e) => setForm({ ...form, quickButton: e.target.checked })} />
          Quick service button on POS
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button className="w-full rounded-lg bg-brass-500 py-2 text-ink-950">Save</button>
      </form>
      <ul className="space-y-2">
        {products.map((p) => (
          <li
            key={p.id}
            className={`rounded-xl border p-3 ${
              p.lowStock ? "border-amber-400/50 bg-amber-950/20" : "border-white/10 bg-ink-900"
            }`}
          >
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-paper-200/50">
                  {p.sku} {p.barcode ? `· ${p.barcode}` : ""}
                </p>
                <p className="text-sm">
                  Sell {lkr(p.sellPrice)} · Cost {lkr(p.costPrice)}
                  {p.trackStock ? ` · Qty ${p.stockQty}` : " · Service"}
                </p>
              </div>
              <button
                className="text-sm text-brass-400"
                onClick={() => {
                  setEditing(p.id);
                  setForm({
                    sku: p.sku,
                    barcode: p.barcode || "",
                    name: p.name,
                    categoryId: p.categoryId,
                    costPrice: p.costPrice,
                    sellPrice: p.sellPrice,
                    trackStock: p.trackStock,
                    stockQty: p.stockQty,
                    lowStockThreshold: p.lowStockThreshold,
                    quickButton: p.quickButton,
                    active: p.active,
                  });
                }}
              >
                Edit
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
