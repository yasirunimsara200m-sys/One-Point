"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const msg = err instanceof Error ? err.message : "Login failed";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Cannot connect to server. Please check your internet connection or API URL.");
      } else {
        setError(msg);
      }
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
          <h2 className="font-display text-2xl text-paper-50">Sign in</h2>
          <p className="mt-1 text-sm text-paper-200/60">
            Enter your credentials to access your account
          </p>

          <label className="mt-6 block text-sm font-medium text-paper-200/80">
            Email address
          </label>
          <div className="relative mt-1">
            <input
              className="w-full rounded-lg border border-white/10 bg-ink-950 py-2.5 pl-10 pr-3 text-paper-50 placeholder:text-paper-200/30 focus:border-brass-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              placeholder="e.g. owner@onepoint.lk"
              required
            />
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-200/40" />
          </div>

          <label className="mt-4 block text-sm font-medium text-paper-200/80">
            Password
          </label>
          <div className="relative mt-1">
            <input
              className="w-full rounded-lg border border-white/10 bg-ink-950 py-2.5 pl-10 pr-10 text-paper-50 placeholder:text-paper-200/30 focus:border-brass-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-paper-200/40" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-paper-200/40 hover:text-paper-100"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-brass-500 py-2.5 font-medium text-ink-950 transition hover:bg-brass-400 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
