"use client";

import { useState, useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

type Lead = {
  id?: number;
  name: string;
  phone: string;
  address: string;
  motivation: string;
  nextFollowUpDate?: string;
};

const RECORD_LIST_OPTIONS = [
  "Leads",
  "Buyer/Agent",
  "Opportunity",
  "Appointment",
  "Contract",
  "Closed",
  "Dead",
] as const;

const LEAD_NOTES_TEMPLATE = `"Tell me a little about what's going on, what has you wanting to sell right now?"
2. "Assuming we agree on an acceptable offer, how soon are you hoping to close and get cash in your pocket?"
3. "Tell me a little about the condition, have there been any updates done in the last 5 years?"
4. "In order to make a decision about selling your property, is there anyone else that you would need to get on board, like a spouse?"
5. "I'm not saying I can but if I could get you an acceptable offer, would you be opposed to putting together an agreement today?"`;

export default function LeadsPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, logout } = useAuth();
  const [form, setForm] = useState<Lead>({
    name: "",
    phone: "",
    address: "",
    motivation: LEAD_NOTES_TEMPLATE,
    nextFollowUpDate: "",
  });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetList, setTargetList] =
    useState<(typeof RECORD_LIST_OPTIONS)[number]>("Leads");

  const fetchLeads = useEffectEvent(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads", error);
    } finally {
      setLoading(false);
    }
  });

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    } else if (currentUser?.appScope === "records-only") {
      router.push("/records");
    }
  }, [isInitialized, isLoggedIn, currentUser, router]);

  useEffect(() => {
    if (isLoggedIn) {
      const timeoutId = window.setTimeout(() => {
        void fetchLeads();
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [isLoggedIn]);

  function updateField(field: keyof Lead, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.name || !form.phone || !form.nextFollowUpDate) {
      alert("Add name, phone, and next follow-up date");
      return;
    }

    try {
      const title = `${form.name} ${form.phone}`.trim();
      const body = [form.address, form.motivation].filter(Boolean).join("\n\n");

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list: targetList,
          title,
          body,
          priority: "Medium",
          followUpCount: 0,
          lastContactOutcome: null,
          lastFollowedUpAt: null,
          followUpAt: form.nextFollowUpDate,
          completed: false,
        }),
      });

      if (res.ok) {
        setForm({
          name: "",
          phone: "",
          address: "",
          motivation: LEAD_NOTES_TEMPLATE,
          nextFollowUpDate: "",
        });
        setTargetList("Leads");
        router.push(`/records#list-${targetList.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save record");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save record");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this lead?")) return;
    try {
      const res = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setLeads((prev) => prev.filter((lead) => lead.id !== id));
      }
    } catch (error) {
      alert("Failed to delete lead");
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (!isLoggedIn || loading) {
    return <div className="p-6">Loading...</div>;
  }

  const canEdit = currentUser?.role === "admin";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f2e8_0%,#f5f7fb_42%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-[32px] border border-white/70 bg-white/85 px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Lex Ventured & Co CRM
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Lead Intake
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Clean seller intake, a simpler save flow, and a better view of what has already
                been captured.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm">
              <div className="text-[11px] uppercase tracking-[0.2em] text-sky-700">
                Saved Leads
              </div>
              <div className="mt-1 text-xl font-semibold text-sky-900">{leads.length}</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-4">
            <Link
              href="/crm"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Home
            </Link>
            <Link
              href="/leads"
              className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 font-medium text-white"
            >
              Leads
            </Link>
            <Link
              href="/deals"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Deal Analyzer
            </Link>
            <Link
              href="/records"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Records
            </Link>
            <Link
              href="/schedule-today"
              className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
            >
              Schedule Today
            </Link>
            {currentUser?.role === "admin" ? (
              <Link
                href="/users"
                className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                Users
              </Link>
            ) : null}
            <button
              onClick={handleLogout}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  New Lead
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Add a seller and move them fast.
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Capture the basics, choose the destination list, and send the lead straight into
                  Records.
                </p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-600">
                Destination: <span className="font-semibold text-slate-900">{targetList}</span>
              </div>
            </div>

            {canEdit ? (
              <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
                <select
                  className="rounded-2xl border border-stone-200 bg-white p-3 md:col-span-2"
                  value={targetList}
                  onChange={(e) =>
                    setTargetList(e.target.value as (typeof RECORD_LIST_OPTIONS)[number])
                  }
                >
                  {RECORD_LIST_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      Send to {option}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-2xl border border-stone-200 bg-white p-3"
                  placeholder="Seller Name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
                <input
                  className="rounded-2xl border border-stone-200 bg-white p-3"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                <input
                  className="rounded-2xl border border-stone-200 bg-white p-3 md:col-span-2"
                  placeholder="Property Address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                />
                <input
                  type="date"
                  className="rounded-2xl border border-stone-200 bg-white p-3 md:col-span-2"
                  value={form.nextFollowUpDate}
                  onChange={(e) => updateField("nextFollowUpDate", e.target.value)}
                />
                <textarea
                  className="rounded-2xl border border-stone-200 bg-white p-3 md:col-span-2"
                  placeholder="Motivation / Notes"
                  value={form.motivation}
                  onChange={(e) => updateField("motivation", e.target.value)}
                  rows={12}
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white transition-colors hover:bg-slate-800 md:col-span-2"
                >
                  Save To Records
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-slate-600">
                View-only access. Only admins can create or delete leads.
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Lead Bank
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Saved Leads
                </h2>
              </div>
              <div className="text-sm text-slate-500">{leads.length} saved</div>
            </div>

            {leads.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                No leads yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-950">{lead.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>{lead.phone}</p>
                          <p>{lead.address || "No address added"}</p>
                        </div>
                      </div>
                      {canEdit ? (
                        <button
                          onClick={() => handleDelete(lead.id!)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-4 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-slate-600">
                      {lead.motivation || "No notes yet."}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
