"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("cashier@onepoint.lk");
  const [password, setPassword] = useState("Cashier@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "OWNER" ? "/owner" : "/pos");
    }
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      router.replace(u.role === "OWNER" ? "/owner" : "/pos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-950">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brass-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-teal-700/20 blur-3xl" />
      <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <section>
          <p className="text-xs uppercase tracking-[0.3em] text-brass-400">
            Sri Lanka · Book shop + comms
          </p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-paper-50">
            One Point
          </h1>
          <p className="mt-4 max-w-md text-paper-200/80">
            Counter billing, barcode stock, photocopy & reload services, and a live
            owner dashboard on your phone.
          </p>
        </section>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-white/10 bg-ink-900/80 p-8 shadow-2xl backdrop-blur"
        >
          <h2 className="font-display text-2xl">Sign in</h2>
          <label className="mt-6 block text-sm text-paper-200/70">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="username"
          />
          <label className="mt-4 block text-sm text-paper-200/70">Password</label>
          <input
            className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-brass-500 py-2.5 font-medium text-ink-950 hover:bg-brass-400 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Enter counter"}
          </button>
          <p className="mt-5 text-xs leading-relaxed text-paper-200/50">
            Demo — owner: owner@onepoint.lk / Owner@123
            <br />
            cashier: cashier@onepoint.lk / Cashier@123
          </p>
        </form>
      </div>
    </main>
  );
}
