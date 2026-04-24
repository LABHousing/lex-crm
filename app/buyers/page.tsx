"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

type Buyer = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  budget: string;
  notes: string;
};

export default function BuyersPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, logout } = useAuth();
  const [form, setForm] = useState<Buyer>({
    name: "",
    phone: "",
    email: "",
    budget: "",
    notes: "",
  });
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    }
  }, [isInitialized, isLoggedIn, router]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchBuyers();
    }
  }, [isLoggedIn]);

  async function fetchBuyers() {
    try {
      const res = await fetch("/api/buyers");
      if (res.ok) {
        const data = await res.json();
        setBuyers(data);
      }
    } catch (error) {
      console.error("Failed to fetch buyers", error);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof Buyer, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name || !form.phone) {
      alert("Add name and phone");
      return;
    }

    try {
      const res = await fetch("/api/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const newBuyer = await res.json();
        setBuyers((prev) => [newBuyer, ...prev]);
        setForm({ name: "", phone: "", email: "", budget: "", notes: "" });
      }
    } catch (error) {
      alert("Failed to save buyer");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this buyer?")) return;
    try {
      const res = await fetch("/api/buyers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setBuyers((prev) => prev.filter((buyer) => buyer.id !== id));
      }
    } catch (error) {
      alert("Failed to delete buyer");
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!isLoggedIn || loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main className="p-6 max-w-4xl mx-auto w-full">
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
            Deals
          </Link>
          <Link href="/records" className="font-medium hover:underline">
            Records
          </Link>
          <Link href="/schedule-today" className="font-medium hover:underline">
            Schedule Today
          </Link>
          <button
            onClick={handleLogout}
            className="text-red-600 font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold mb-4">Buyers</h1>
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2 mb-8">
        <input
          className="border rounded p-3"
          placeholder="Buyer Name"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
        />
        <input
          className="border rounded p-3"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
        />
        <input
          className="border rounded p-3"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => updateField("email", e.target.value)}
        />
        <input
          className="border rounded p-3"
          placeholder="Budget"
          value={form.budget}
          onChange={(e) => updateField("budget", e.target.value)}
        />
        <textarea
          className="border rounded p-3 md:col-span-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={4}
        />
        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-3 md:col-span-2 hover:bg-gray-800"
        >
          Save Buyer
        </button>
      </form>

      <section>
        <h2 className="text-xl font-semibold mb-3">Saved Buyers</h2>
        {buyers.length === 0 ? (
          <p>No buyers yet.</p>
        ) : (
          <div className="grid gap-4">
            {buyers.map((buyer) => (
              <div
                key={buyer.id}
                className="border rounded p-4 flex justify-between items-start"
              >
                <div>
                  <h3 className="font-semibold">{buyer.name}</h3>
                  <p>{buyer.phone}</p>
                  <p>{buyer.email}</p>
                  <p className="text-sm">Budget: {buyer.budget}</p>
                  <p className="text-sm text-gray-600 mt-2">{buyer.notes}</p>
                </div>
                <button
                  onClick={() => handleDelete(buyer.id!)}
                  className="text-red-500 text-sm hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
