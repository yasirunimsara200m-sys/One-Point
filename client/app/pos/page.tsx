"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Guard, TopBar } from "@/components/Guard";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { lkr } from "@/lib/money";

type Category = { id: string; name: string; kind: string };
type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  sellPrice: number;
  trackStock: boolean;
  stockQty: number;
  lowStock: boolean;
  quickButton: boolean;
  category?: Category;
};
type Customer = { id: string; name: string; phone: string; creditBalance: number };
type CartLine = {
  product: Product;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
};
type Sale = {
  id: string;
  invoiceNo: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  cashAmount: number;
  cardAmount: number;
  creditAmount: number;
  cashTendered: number;
  changeGiven: number;
  items: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  cashier?: { name: string };
  customer?: { name: string } | null;
};

export default function PosPage() {
  return (
    <Guard>
      <PosInner />
    </Guard>
  );
}

function PosInner() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [payMode, setPayMode] = useState<"CASH" | "CARD" | "CREDIT">("CASH");
  const [tendered, setTendered] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  async function loadCatalog(q = query, categoryId = cat) {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (categoryId) qs.set("categoryId", categoryId);
    const [p, c, cust] = await Promise.all([
      api<Product[]>(`/api/products?${qs.toString()}`),
      api<Category[]>("/api/categories"),
      api<Customer[]>("/api/customers"),
    ]);
    setProducts(p);
    setCategories(c);
    setCustomers(cust);
  }

  useEffect(() => {
    loadCatalog().catch((e) => setError(e.message));
    barcodeRef.current?.focus();
  }, []);

  const quick = products.filter((p) => p.quickButton);
  const grid = products.filter((p) => (cat ? true : !p.quickButton) || cat);

  const subtotal = cart.reduce(
    (s, l) => s + l.unitPrice * l.qty - l.lineDiscount,
    0
  );
  const total = Math.max(0, round(subtotal - billDiscount));
  const tenderNum = Number(tendered || 0);
  const change =
    payMode === "CASH" ? Math.max(0, round(tenderNum - total)) : 0;

  function addProduct(p: Product, qty = 1) {
    setLastSale(null);
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { product: p, qty, unitPrice: p.sellPrice, lineDiscount: 0 }];
    });
  }

  async function onBarcode(code: string) {
    if (!code.trim()) return;
    try {
      const p = await api<Product>(`/api/products/barcode/${encodeURIComponent(code.trim())}`);
      addProduct(p);
      setError("");
    } catch {
      setError(`No item for barcode ${code}`);
    }
  }

  async function checkout() {
    if (!cart.length) return;
    setBusy(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        items: cart.map((l) => ({
          productId: l.product.id,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineDiscount: l.lineDiscount,
        })),
        discount: billDiscount,
        cashAmount: payMode === "CASH" ? total : 0,
        cardAmount: payMode === "CARD" ? total : 0,
        creditAmount: payMode === "CREDIT" ? total : 0,
        cashTendered: payMode === "CASH" ? (tenderNum || total) : 0,
        customerId: payMode === "CREDIT" ? customerId : customerId || undefined,
      };
      const sale = await api<Sale>("/api/sales", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setLastSale(sale);
      setCart([]);
      setBillDiscount(0);
      setTendered("");
      await loadCatalog();
      setTimeout(() => window.print(), 250);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sale failed");
    } finally {
      setBusy(false);
      barcodeRef.current?.focus();
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="Counter billing"
        right={
          <button
            className="rounded-md bg-brass-500 px-3 py-1.5 text-ink-950"
            onClick={() => barcodeRef.current?.focus()}
          >
            Focus scanner
          </button>
        }
      />
      <div className="grid flex-1 gap-3 p-3 lg:grid-cols-[1.2fr_0.9fr_0.85fr]">
        <section className="flex flex-col rounded-xl border border-white/10 bg-ink-900 p-3">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onBarcode(query);
              setQuery("");
            }}
          >
            <input
              ref={barcodeRef}
              className="flex-1 rounded-lg border border-white/10 bg-ink-950 px-3 py-2"
              placeholder="Scan barcode or search name / SKU"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                loadCatalog(e.target.value, cat).catch(() => {});
              }}
            />
          </form>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip active={!cat} onClick={() => { setCat(""); loadCatalog(query, ""); }}>
              All
            </Chip>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={cat === c.id}
                onClick={() => {
                  setCat(c.id);
                  loadCatalog(query, c.id);
                }}
              >
                {c.name}
              </Chip>
            ))}
          </div>
          <div className="mt-3 grid auto-rows-min grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
            {grid.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="rounded-lg border border-white/10 bg-ink-800 p-3 text-left hover:border-brass-400/60"
              >
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="mt-1 text-brass-400">{lkr(p.sellPrice)}</p>
                <p className="text-[11px] text-paper-200/50">
                  {p.trackStock
                    ? p.lowStock
                      ? `Low · ${p.stockQty}`
                      : `Stock ${p.stockQty}`
                    : "Service"}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col rounded-xl border border-white/10 bg-ink-900 p-3">
          <h3 className="font-display text-lg">Cart</h3>
          <div className="mt-2 flex-1 space-y-2 overflow-auto">
            {cart.length === 0 && (
              <p className="text-sm text-paper-200/50">Scan or tap an item.</p>
            )}
            {cart.map((l) => (
              <div key={l.product.id} className="rounded-lg bg-ink-800 p-2">
                <div className="flex justify-between gap-2">
                  <p className="text-sm">{l.product.name}</p>
                  <button
                    className="text-xs text-red-300"
                    onClick={() => setCart(cart.filter((x) => x.product.id !== l.product.id))}
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <button
                    className="h-7 w-7 rounded bg-white/10"
                    onClick={() =>
                      setCart(
                        cart.map((x) =>
                          x.product.id === l.product.id
                            ? { ...x, qty: Math.max(1, x.qty - 1) }
                            : x
                        )
                      )
                    }
                  >
                    −
                  </button>
                  <span className="w-8 text-center">{l.qty}</span>
                  <button
                    className="h-7 w-7 rounded bg-white/10"
                    onClick={() =>
                      setCart(
                        cart.map((x) =>
                          x.product.id === l.product.id ? { ...x, qty: x.qty + 1 } : x
                        )
                      )
                    }
                  >
                    +
                  </button>
                  <span className="ml-auto">{lkr(l.unitPrice * l.qty - l.lineDiscount)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm">
            <Row label="Subtotal" value={lkr(subtotal)} />
            <label className="flex items-center justify-between">
              Discount
              <input
                type="number"
                min={0}
                className="w-28 rounded bg-ink-950 px-2 py-1 text-right"
                value={billDiscount}
                onChange={(e) => setBillDiscount(Number(e.target.value) || 0)}
              />
            </label>
            <Row label="Total" value={lkr(total)} strong />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="rounded-xl border border-white/10 bg-ink-900 p-3">
            <h3 className="font-display">Quick services</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {quick.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="rounded-lg bg-teal-900/50 px-2 py-3 text-left text-sm ring-1 ring-teal-500/30 hover:bg-teal-800/50"
                >
                  {p.name}
                  <span className="mt-1 block text-xs text-brass-400">{lkr(p.sellPrice)}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-900 p-3">
            <h3 className="font-display">Payment</h3>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["CASH", "CARD", "CREDIT"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPayMode(m)}
                  className={`rounded-lg py-2 text-sm ${
                    payMode === m ? "bg-brass-500 text-ink-950" : "bg-white/10"
                  }`}
                >
                  {m === "CASH" ? "Cash" : m === "CARD" ? "Card" : "Credit"}
                </button>
              ))}
            </div>
            {payMode === "CASH" && (
              <label className="mt-3 block text-sm">
                Cash tendered
                <input
                  className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
                  type="number"
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  placeholder={String(total)}
                />
                <p className="mt-1 text-paper-200/70">Change {lkr(change)}</p>
              </label>
            )}
            {(payMode === "CREDIT" || customerId) && (
              <label className="mt-3 block text-sm">
                Customer
                <select
                  className="mt-1 w-full rounded bg-ink-950 px-2 py-2"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) {c.creditBalance > 0 ? `· due ${lkr(c.creditBalance)}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            <button
              disabled={busy || !cart.length || (payMode === "CREDIT" && !customerId)}
              onClick={checkout}
              className="mt-4 w-full rounded-lg bg-brass-500 py-3 font-medium text-ink-950 disabled:opacity-50"
            >
              {busy ? "Saving…" : `Charge ${lkr(total)}`}
            </button>
            <p className="mt-2 text-[11px] text-paper-200/40">
              Signed in as {user?.name}. Cost prices are hidden for cashiers.
            </p>
          </div>
        </section>
      </div>
      <Receipt sale={lastSale} />
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs ${
        active ? "bg-brass-500 text-ink-950" : "bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function Receipt({ sale }: { sale: Sale | null }) {
  const shop = useMemo(
    () => ({
      name: "One Point",
      line: "Books · Photocopy · Reloads",
      addr: "Sri Lanka",
    }),
    []
  );
  if (!sale) return <div id="receipt" className="hidden" />;
  return (
    <div id="receipt" className="hidden p-3 text-black print:block">
      <div className="text-center">
        <h1 className="text-lg font-bold">{shop.name}</h1>
        <p className="text-xs">{shop.line}</p>
        <p className="text-xs">{shop.addr}</p>
        <p className="mt-2 text-xs">{sale.invoiceNo}</p>
        <p className="text-xs">{new Date(sale.createdAt).toLocaleString("en-LK")}</p>
        <p className="text-xs">Cashier: {sale.cashier?.name}</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      {sale.items.map((i, idx) => (
        <div key={idx} className="flex justify-between text-xs">
          <span>
            {i.name} × {i.qty}
          </span>
          <span>{lkr(i.lineTotal)}</span>
        </div>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <p className="flex justify-between text-xs">
        <span>Subtotal</span>
        <span>{lkr(sale.subtotal)}</span>
      </p>
      {sale.discount > 0 && (
        <p className="flex justify-between text-xs">
          <span>Discount</span>
          <span>{lkr(sale.discount)}</span>
        </p>
      )}
      <p className="flex justify-between font-bold">
        <span>Total</span>
        <span>{lkr(sale.total)}</span>
      </p>
      {sale.cashAmount > 0 && (
        <p className="flex justify-between text-xs">
          <span>Cash</span>
          <span>{lkr(sale.cashTendered || sale.cashAmount)}</span>
        </p>
      )}
      {sale.changeGiven > 0 && (
        <p className="flex justify-between text-xs">
          <span>Change</span>
          <span>{lkr(sale.changeGiven)}</span>
        </p>
      )}
      {sale.cardAmount > 0 && (
        <p className="flex justify-between text-xs">
          <span>Card</span>
          <span>{lkr(sale.cardAmount)}</span>
        </p>
      )}
      {sale.creditAmount > 0 && (
        <p className="flex justify-between text-xs">
          <span>Credit</span>
          <span>{lkr(sale.creditAmount)}</span>
        </p>
      )}
      <p className="mt-4 text-center text-xs">Thank you. ඔබට ස්තුතියි.</p>
    </div>
  );
}
