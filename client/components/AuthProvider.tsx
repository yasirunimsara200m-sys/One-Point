"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import {
  clearSession,
  readUser,
  saveSession,
  type AuthUser,
} from "@/lib/auth";

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = readUser();
    if (!existing) {
      setReady(true);
      return;
    }
    api<{ user: AuthUser }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      async login(email, password) {
        const res = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        saveSession(res.token, res.user);
        setUser(res.user);
        return res.user;
      },
      logout() {
        clearSession();
        setUser(null);
      },
    }),
    [user, ready]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
