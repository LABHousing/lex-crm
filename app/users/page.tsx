"use client";

import { FormEvent, useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

type UserItem = {
  id: number;
  username: string | null;
  role: string | null;
  appScope: string | null;
  recordsScope: string | null;
};

export default function UsersPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, currentUsername, logout } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    } else if (currentUser?.role !== "admin") {
      router.push(currentUser?.appScope === "records-only" ? "/records" : "/");
    }
  }, [isInitialized, isLoggedIn, currentUser, router]);

  const loadUsers = useEffectEvent(async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();

      if (res.ok) {
        setUsers(data);
      }
    } catch (loadError) {
      console.error("Failed to load users", loadError);
    }
  });

  useEffect(() => {
    if (isInitialized !== true || !isLoggedIn) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isInitialized, isLoggedIn]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      setUsers((prev) => [...prev, data].sort((a, b) => (a.username || "").localeCompare(b.username || "")));
      setUsername("");
      setPassword("");
      setMessage(`Created user ${data.username}`);
    } catch {
      setError("Failed to create user");
    }
  }

  if (!isLoggedIn || isInitialized === null || currentUser?.role !== "admin") {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6 border-b pb-3">
        <h1 className="text-lg font-bold">Lex Ventured & Co CRM</h1>
        <div className="flex gap-6 items-center">
          <Link href="/crm" className="font-medium hover:underline">
            Home
          </Link>
          <Link href="/leads" className="font-medium hover:underline">
            Leads
          </Link>
          <Link href="/deals" className="font-medium hover:underline">
            Deal Analyzer
          </Link>
          <Link href="/records" className="font-medium hover:underline">
            Records
          </Link>
          <Link href="/schedule-today" className="font-medium hover:underline">
            Schedule Today
          </Link>
          <Link href="/users" className="font-medium hover:underline">
            Users
          </Link>
          <button
            onClick={handleLogout}
            className="text-red-600 font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add separate username and password logins for your team.
          </p>
        </div>
        <div className="rounded border bg-white px-4 py-3 text-sm text-gray-600">
          Signed in as <span className="font-semibold text-gray-900">{currentUsername}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">Create User</h2>
          <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
            <input
              className="w-full border rounded p-3"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="w-full border rounded p-3"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            <button className="w-full rounded bg-black px-4 py-3 font-medium text-white hover:bg-gray-800">
              Add User
            </button>
          </form>
        </section>

        <section className="rounded border bg-white p-5">
          <h2 className="text-lg font-semibold">Existing Users</h2>
          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="rounded border bg-gray-50 px-4 py-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-medium">{user.username || `user-${user.id}`}</div>
                  <div className="text-sm text-gray-500">User ID {user.id}</div>
                </div>
                {user.username === currentUsername ? (
                  <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs font-medium text-white">
                    Current
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
