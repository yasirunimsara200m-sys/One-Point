"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Guard } from "@/components/Guard";
import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/owner", label: "Live" },
  { href: "/owner/inventory", label: "Stock" },
  { href: "/owner/customers", label: "Customers" },
  { href: "/owner/reports", label: "Reports" },
  { href: "/owner/drawer", label: "Drawer" },
  { href: "/owner/users", label: "Users" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard roles={["OWNER"]}>
      <Shell>{children}</Shell>
    </Guard>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <div className="min-h-screen bg-ink-950 pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-ink-900/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="font-display text-lg">One Point</p>
          <p className="text-xs text-paper-200/60">Owner · {user?.name}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-md bg-brass-500 px-3 py-1.5 text-sm text-ink-950"
            onClick={() => router.push("/pos")}
          >
            Open POS
          </button>
          <button
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-6 border-t border-white/10 bg-ink-900/95 text-[11px] backdrop-blur sm:text-xs">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`py-3 text-center ${
              path === l.href ? "text-brass-400" : "text-paper-200/70"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
