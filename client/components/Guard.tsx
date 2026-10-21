"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import type { Role } from "@/lib/auth";

export function Guard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (roles && !roles.includes(user.role)) {
      router.replace(user.role === "OWNER" ? "/owner" : "/pos");
    }
  }, [ready, user, roles, router]);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-paper-100">
        Loading…
      </div>
    );
  }
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}

export function TopBar({ title, right }: { title: string; right?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <header className="flex items-center justify-between border-b border-white/10 bg-ink-900 px-4 py-3 text-paper-50 print:hidden">
      <div>
        <p className="font-display text-lg tracking-tight">One Point</p>
        <p className="text-xs text-paper-200/70">{title}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {right}
        <span className="hidden sm:inline text-paper-200/80">
          {user?.name} · {user?.role === "OWNER" ? "Owner" : "Cashier"}
        </span>
        {user?.role === "OWNER" && (
          <button
            className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
            onClick={() => router.push("/owner")}
          >
            Dashboard
          </button>
        )}
        <button
          className="rounded-md bg-white/10 px-3 py-1.5 hover:bg-white/15"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
