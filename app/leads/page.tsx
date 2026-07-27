"use client";

import { useState, useEffect, useEffectEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

type Lead = {
  name: string;
  phone: string;
  address: string;
  motivation: string;
  nextFollowUpDate?: string;
  leadCost: string;
};

type SavedLead = {
  id: number;
  title: string;
  body: string | null;
  list: string;
  leadCost: number;
  createdAt: string;
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

const LEAD_NOTES_TEMPLATE = `Open:
Asking Price:
Condition:
Timeline:
Motivation:
Close:`;

const LEAD_CALL_SCRIPTS = {
  open: `PHASE 01 · 15-30 SEC

Hey, this is [NAME] — I got a message you've got a property at [ADDRESS] you're thinking about selling. Got a quick minute?

Cool — tell me a bit about the place. What made you reach out today?

Just so I'm not flying blind — anyone else on title with you?`,
  condition: `How long have you owned the place?

When was the last time it had any major work — roof, HVAC, plumbing?

If you walked through right now and listed everything that needs fixing, what would you say?

Anyone living there? Tenants, family, or vacant?`,
  timeline: `PILLAR 02 · Timeline

If we could make this happen, when would you ideally want to close?

What happens if it doesn't sell in that window?

Is there a hard deadline driving this — court date, foreclosure, move-out?`,
  motivation: `PILLAR 03 · Motivation

What's making you sell now versus a year ago?

If you could wave a wand and have this whole thing handled, what would that look like for you?

What have you tried so far — agents, FSBO, other investors?`,
  price: `PILLAR 04 · Price

What's the lowest number you'd take to put this behind you today?
If I came back with cash — no agents, no repairs, no inspection — what number makes this an easy yes?
Where did that number come from — Zillow, an agent, a neighbor?`,
  close: `PHASE 06 ·  Close

Path A — Walkthrough: 'I'd love to swing by Thursday or Friday — which works better?'

Path B — Phone offer:
Just so I know we're on the same page—if I'm able to get you an offer you're comfortable with today, is there any reason we couldn't move forward with an agreement?

If I can get you an offer that was As-is, for ALL CASH, so no appraisal or financing, AND even better with no commission or ANY cost to you. Hold up it gets better, you don't even have to make any repairs, and if I could close on your timeline, what would you be willing to take for an offer like that?`,
} as const;

const LEAD_CALL_SCRIPT_OPTIONS = [
  { key: "open", label: "Open" },
  { key: "price", label: "Asking Price" },
  { key: "condition", label: "Condition" },
  { key: "timeline", label: "Timeline" },
  { key: "motivation", label: "Motivation" },
  { key: "close", label: "Close" },
] as const;

export default function LeadsPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, logout } = useAuth();
  const [form, setForm] = useState<Lead>({
    name: "",
    phone: "",
    address: "",
    motivation: LEAD_NOTES_TEMPLATE,
    nextFollowUpDate: "",
    leadCost: "",
  });
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetList, setTargetList] =
    useState<(typeof RECORD_LIST_OPTIONS)[number]>("Leads");
  const [selectedScript, setSelectedScript] =
    useState<(typeof LEAD_CALL_SCRIPT_OPTIONS)[number]["key"]>("open");

  const fetchLeads = useEffectEvent(async () => {
    try {
      const res = await fetch("/api/records", { cache: "no-store" });
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
          leadCost: Number(form.leadCost) || 0,
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
          leadCost: "",
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
      const res = await fetch("/api/records", {
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
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + mondayOffset);
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const weeklyLeads = leads
    .filter((lead) => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= weekStart && createdAt < nextMonday;
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

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
              <div className="mt-1 text-xl font-semibold text-sky-900">{weeklyLeads.length}</div>
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
                <div className="relative md:col-span-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-2xl border border-stone-200 bg-white p-3 pl-8 pr-14"
                    placeholder="Pay per Lead"
                    value={form.leadCost}
                    onChange={(e) => updateField("leadCost", e.target.value)}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    PPL
                  </span>
                </div>
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

          <section className="self-start rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="rounded-[28px] border border-stone-200 bg-[#f8f5ee] p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                Call Script Boxes
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {LEAD_CALL_SCRIPT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedScript(option.key)}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      selectedScript === option.key
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-stone-200 bg-white text-slate-800 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  {LEAD_CALL_SCRIPT_OPTIONS.find((option) => option.key === selectedScript)?.label}
                </div>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-800">
                  {LEAD_CALL_SCRIPTS[selectedScript]}
                </pre>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Lead Bank
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  Saved Leads
                </h2>
              </div>
              <div className="text-sm text-slate-500">{weeklyLeads.length} saved</div>
            </div>

            <div className="mt-3 text-sm text-slate-500">
              Weekly view. Resets every Monday.
            </div>

            {weeklyLeads.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                No leads yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {weeklyLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-950">{lead.title}</h3>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>{lead.list}</p>
                          <p>Pay per Lead: ${lead.leadCost.toFixed(2)}</p>
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
                      {lead.body || "No notes yet."}
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
