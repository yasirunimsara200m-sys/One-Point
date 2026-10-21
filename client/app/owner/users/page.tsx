"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "CASHIER";
  active: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CASHIER" | "OWNER">("CASHIER");
  const [error, setError] = useState("");

  async function load() {
    setUsers(await api<User[]>("/api/users"));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function toggle(u: User) {
    await api(`/api/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !u.active }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">Users</h1>
      <form onSubmit={create} className="space-y-2 rounded-xl border border-white/10 bg-ink-900 p-4">
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Name" value={name}
          onChange={(e) => setName(e.target.value)} required />
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Email" type="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded bg-ink-950 px-2 py-2" placeholder="Password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select className="w-full rounded bg-ink-950 px-2 py-2" value={role}
          onChange={(e) => setRole(e.target.value as "CASHIER" | "OWNER")}>
          <option value="CASHIER">Cashier</option>
          <option value="OWNER">Owner</option>
        </select>
        <button className="w-full rounded-lg bg-brass-500 py-2 text-ink-950">Create user</button>
      </form>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-900 p-3">
            <div>
              <p>{u.name}</p>
              <p className="text-xs text-paper-200/50">
                {u.email} · {u.role} {u.active ? "" : "· disabled"}
              </p>
            </div>
            <button className="text-sm text-brass-400" onClick={() => toggle(u)}>
              {u.active ? "Disable" : "Enable"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
