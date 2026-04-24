"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { isLoggedIn, isInitialized, login } = useAuth();
  const loading = isInitialized === null;
  const isSetupMode = isInitialized === false;

  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/crm");
    }
  }, [isLoggedIn, router]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (setupUsername.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (setupPassword.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    try {
      const res = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: setupUsername,
          password: setupPassword,
        }),
      });

      if (res.ok) {
        setSetupUsername("");
        setSetupPassword("");
        alert("Setup complete! Now log in with your username and password.");
      } else {
        const data = await res.json();
        setError(data.error || "Setup failed");
      }
    } catch {
      setError("Setup failed");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const success = await login(username, password);
    if (success) {
      router.push("/crm");
    } else {
      setError("Incorrect username or password");
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6 flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">Lex Ventured & Co CRM</h1>

        {isSetupMode ? (
          <>
            <h2 className="text-xl font-bold mb-4">Setup Password</h2>
            <p className="text-gray-600 mb-6">
              Create the first username and password for your CRM.
            </p>
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Create Username"
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  className="w-full border rounded p-3"
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Create Password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="w-full border rounded p-3"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-black text-white rounded px-4 py-3 font-medium hover:bg-gray-800"
              >
                Create Password
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border rounded p-3"
                  autoFocus
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded p-3"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button
                type="submit"
                className="w-full bg-black text-white rounded px-4 py-3 font-medium hover:bg-gray-800"
              >
                Login
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
