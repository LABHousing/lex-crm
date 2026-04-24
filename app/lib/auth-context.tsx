"use client";
import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import type { AppScope, RecordsScope, UserRole } from "@/app/lib/auth";

type CurrentUser = {
  id: number;
  username: string | null;
  role: UserRole;
  appScope: AppScope;
  recordsScope: RecordsScope;
};

type AuthContextType = {
  isLoggedIn: boolean;
  isInitialized: boolean | null;
  currentUser: CurrentUser | null;
  currentUsername: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    void checkInitialization();
    void checkAuth();
  }, []);

  async function checkInitialization() {
    try {
      const res = await fetch("/api/auth/init");
      const data = await res.json();
      setIsInitialized(data.initialized);
    } catch {
      setIsInitialized(false);
    }
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      const data = await res.json();
      setIsLoggedIn(!!data.authenticated);
      setCurrentUser(data.user || null);
      setCurrentUsername(data.user?.username || null);
    } catch {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentUsername(null);
    }
  }

  async function login(username: string, password: string) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        await checkAuth();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentUsername(null);
    } catch {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setCurrentUsername(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isInitialized,
        currentUser,
        currentUsername,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
