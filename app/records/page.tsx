"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { formatFixedCstDateTime, toFixedCstDateTimeInput } from "@/app/lib/fixed-cst";

type RecordItem = {
  id: number;
  list: string;
  title: string;
  body: string | null;
  status: string;
  priority: string;
  leadSource: string | null;
  leadCost: number;
  followUpCount: number;
  lastContactOutcome: string | null;
  lastFollowedUpAt: string | null;
  followUpAt: string | null;
  completed: boolean;
  createdAt: string;
};

type EditForm = {
  list: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  leadSource: string;
  leadCost: string;
  followUpCount: string;
  lastContactOutcome: string;
  lastFollowedUpAt: string;
  followUpAt: string;
  completed: boolean;
};

type PipelineCard = {
  key: string;
  label: string;
  count: number;
  primaryPct: number | null;
  primaryLabel: string;
  secondaryPct: number | null;
  secondaryLabel: string;
  accent: string;
  tone: string;
};

const LIST_ORDER = [
  "Dead",
  "Leads",
  "Buyer/Agent",
  "Opportunity",
  "Appointment",
  "Contract",
  "Closed",
] as const;

const SELLER_LISTS = [
  "Dead",
  "Leads",
  "Opportunity",
  "Appointment",
  "Contract",
  "Closed",
] as const;

const PIPELINE_LABELS = {
  Leads: "Lead",
  Opportunity: "Opportunity",
  Appointment: "Appointment",
  Contract: "Contract",
  Closed: "Closed",
  Dead: "Dead",
} as const;

const LEAD_SOURCE_OPTIONS = [
  "ISpeedToLead",
  "Property Leads",
  "Agent",
  "EGEN",
  "Subgen",
] as const;

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"] as const;

const CONTACT_OUTCOME_OPTIONS = [
  "No Answer",
  "Left Voicemail",
  "Spoke - Interested",
  "Spoke - Not Ready",
  "Call Back Later",
  "Appointment Set",
  "Contract Sent",
  "Dead Lead",
] as const;

function isSellerLead(record: RecordItem) {
  return SELLER_LISTS.includes(record.list as (typeof SELLER_LISTS)[number]);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getWeekStart(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function getWeekEnd(date: Date) {
  const next = getWeekStart(date);
  next.setDate(next.getDate() + 6);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getListAnchor(listName: string) {
  return `list-${listName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getStatusAnchor(statusName: string) {
  return `status-${statusName.toLowerCase()}`;
}

function isUrgentRecord(record: RecordItem) {
  return record.priority === "Urgent" || record.status === "Urgent";
}

function isCompletedRecord(record: RecordItem) {
  return record.status === "Finished" || record.completed;
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function getPipelineCards(records: RecordItem[]): PipelineCard[] {
  const counts = SELLER_LISTS.reduce<Record<string, number>>((acc, listName) => {
    acc[listName] = records.filter((record) => record.list === listName).length;
    return acc;
  }, {});

  const leads = counts.Leads || 0;
  const opportunities = counts.Opportunity || 0;
  const appointments = counts.Appointment || 0;
  const contracts = counts.Contract || 0;
  const closed = counts.Closed || 0;
  const dead = counts.Dead || 0;

  return [
    {
      key: "Leads",
      label: PIPELINE_LABELS.Leads,
      count: leads,
      primaryPct: leads > 0 ? 100 : null,
      primaryLabel: "Base pipeline",
      secondaryPct: toPercent(dead, leads),
      secondaryLabel: "Became dead",
      accent: "text-slate-900",
      tone: "border-slate-200 bg-white",
    },
    {
      key: "Opportunity",
      label: PIPELINE_LABELS.Opportunity,
      count: opportunities,
      primaryPct: toPercent(opportunities, leads),
      primaryLabel: "Of leads",
      secondaryPct:
        leads > 0 && toPercent(opportunities, leads) !== null
          ? 100 - (toPercent(opportunities, leads) ?? 0)
          : null,
      secondaryLabel: "Stayed in lead stage",
      accent: "text-sky-800",
      tone: "border-sky-200 bg-sky-50/70",
    },
    {
      key: "Appointment",
      label: PIPELINE_LABELS.Appointment,
      count: appointments,
      primaryPct: toPercent(appointments, opportunities),
      primaryLabel: "Of opportunities",
      secondaryPct:
        opportunities > 0 && toPercent(appointments, opportunities) !== null
          ? 100 - (toPercent(appointments, opportunities) ?? 0)
          : null,
      secondaryLabel: "Dropped before appointment",
      accent: "text-violet-800",
      tone: "border-violet-200 bg-violet-50/70",
    },
    {
      key: "Contract",
      label: PIPELINE_LABELS.Contract,
      count: contracts,
      primaryPct: toPercent(contracts, appointments),
      primaryLabel: "Of appointments",
      secondaryPct:
        appointments > 0 && toPercent(contracts, appointments) !== null
          ? 100 - (toPercent(contracts, appointments) ?? 0)
          : null,
      secondaryLabel: "Dropped before contract",
      accent: "text-emerald-800",
      tone: "border-emerald-200 bg-emerald-50/70",
    },
    {
      key: "Closed",
      label: PIPELINE_LABELS.Closed,
      count: closed,
      primaryPct: toPercent(closed, contracts),
      primaryLabel: "Of contracts",
      secondaryPct:
        contracts > 0 && toPercent(closed, contracts) !== null
          ? 100 - (toPercent(closed, contracts) ?? 0)
          : null,
      secondaryLabel: "Did not close",
      accent: "text-amber-800",
      tone: "border-amber-200 bg-amber-50/70",
    },
    {
      key: "Dead",
      label: PIPELINE_LABELS.Dead,
      count: dead,
      primaryPct: toPercent(dead, leads),
      primaryLabel: "Of leads",
      secondaryPct:
        leads > 0 && toPercent(dead, leads) !== null ? 100 - (toPercent(dead, leads) ?? 0) : null,
      secondaryLabel: "Still active or won",
      accent: "text-rose-800",
      tone: "border-rose-200 bg-rose-50/70",
    },
  ];
}

export default function RecordsPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, logout } = useAuth();
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    }
  }, [isInitialized, isLoggedIn, router]);

  useEffect(() => {
    async function fetchRecords() {
      try {
        const res = await fetch("/api/records", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setRecords(data);
        }
      } catch (error) {
        console.error("Failed to fetch records", error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoggedIn) {
      void fetchRecords();
    }
  }, [isLoggedIn]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function startEditing(record: RecordItem) {
    setEditingId(record.id);
    setEditForm({
      list: record.list,
      title: record.title,
      body: record.body ?? "",
      status:
        record.completed || record.status === "Finished"
          ? "Finished"
          : record.priority === "Urgent" || record.status === "Urgent"
            ? "Urgent"
            : "Active",
      priority: record.priority || "Medium",
      leadSource: record.leadSource || "",
      leadCost: String(record.leadCost ?? 0),
      followUpCount: String(record.followUpCount ?? 0),
      lastContactOutcome: record.lastContactOutcome || "",
      lastFollowedUpAt: toFixedCstDateTimeInput(record.lastFollowedUpAt),
      followUpAt: toFixedCstDateTimeInput(record.followUpAt),
      completed: record.completed,
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveRecord(id: number) {
    if (!editForm) return;

    try {
      const res = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...editForm,
          status: editForm.completed
            ? "Finished"
            : editForm.priority === "Urgent"
              ? "Urgent"
              : "Active",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update");
      }

      const updated = await res.json();
      setRecords((prev) => prev.map((record) => (record.id === id ? updated : record)));
      cancelEditing();
    } catch (error) {
      console.error("Failed to update record", error);
      alert(error instanceof Error ? error.message : "Failed to update record");
    }
  }

  async function deleteRecord(id: number) {
    if (!confirm("Delete this record?")) {
      return;
    }

    try {
      const res = await fetch("/api/records", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      setRecords((prev) => prev.filter((record) => record.id !== id));

      if (editingId === id) {
        cancelEditing();
      }
    } catch (error) {
      console.error("Failed to delete record", error);
      alert("Failed to delete record");
    }
  }

  const groupedRecords = useMemo(
    () =>
      records.reduce<Record<string, RecordItem[]>>((groups, record) => {
        if (!groups[record.list]) {
          groups[record.list] = [];
        }

        groups[record.list].push(record);
        return groups;
      }, {}),
    [records]
  );

  const urgentRecords = records.filter(isUrgentRecord);
  const completedRecords = records.filter(isCompletedRecord);
  const showStatusGroups = currentUser?.recordsScope !== "contract-only";
  const orderedLists = LIST_ORDER.filter((listName) => {
    if (currentUser?.recordsScope === "contract-only") {
      return listName === "Contract" && groupedRecords[listName]?.length;
    }

    const visibleItems = (groupedRecords[listName] || []).filter((record) => {
      if (!showStatusGroups) {
        return true;
      }

      return !isUrgentRecord(record) && !isCompletedRecord(record);
    });

    return visibleItems.length > 0;
  });
  const sellerRecords = records.filter(isSellerLead);
  const pipelineCards = useMemo(() => getPipelineCards(sellerRecords), [sellerRecords]);
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);
  const weeklySpend = sellerRecords
    .filter((record) => {
      const createdAt = new Date(record.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart && createdAt <= weekEnd;
    })
    .reduce((sum, record) => sum + (record.leadCost || 0), 0);
  const monthlySpend = sellerRecords
    .filter((record) => {
      const createdAt = new Date(record.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= monthStart && createdAt <= monthEnd;
    })
    .reduce((sum, record) => sum + (record.leadCost || 0), 0);
  const lifetimeSpend = sellerRecords.reduce((sum, record) => sum + (record.leadCost || 0), 0);

  function renderRecordCard(item: RecordItem) {
    const canEdit = currentUser?.role === "admin";
    const sellerLead = isSellerLead(item);

    return (
      <article
        key={item.id}
        className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] transition-transform duration-200 hover:-translate-y-0.5"
      >
        {canEdit && editingId === item.id && editForm ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="rounded-2xl border border-stone-200 bg-white p-3"
                value={editForm.list}
                onChange={(e) =>
                  setEditForm((prev) => (prev ? { ...prev, list: e.target.value } : prev))
                }
              >
                {LIST_ORDER.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-3 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.completed}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            completed: e.target.checked,
                            status: e.target.checked
                              ? "Finished"
                              : prev.priority === "Urgent"
                                ? "Urgent"
                                : "Active",
                          }
                        : prev
                    )
                  }
                />
                Finished
              </label>
              <select
                className="rounded-2xl border border-stone-200 bg-white p-3"
                value={editForm.priority}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          priority: e.target.value,
                          status: prev.completed
                            ? "Finished"
                            : e.target.value === "Urgent"
                              ? "Urgent"
                              : "Active",
                        }
                      : prev
                  )
                }
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Priority: {option}
                  </option>
                ))}
              </select>
              <label className="rounded-2xl border border-stone-200 bg-white p-3 text-sm text-slate-600">
                <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Next Follow-Up Date
                </div>
                <input
                  type="datetime-local"
                  className="w-full bg-transparent outline-none"
                  value={editForm.followUpAt}
                  onChange={(e) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, followUpAt: e.target.value } : prev
                    )
                  }
                />
              </label>
              {sellerLead ? (
                <>
                  <select
                    className="rounded-2xl border border-stone-200 bg-white p-3"
                    value={editForm.leadSource}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, leadSource: e.target.value } : prev
                      )
                    }
                  >
                    <option value="">Lead Source</option>
                    {LEAD_SOURCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="rounded-2xl border border-stone-200 bg-white p-3"
                    placeholder="Lead Cost"
                    value={editForm.leadCost}
                    onChange={(e) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, leadCost: e.target.value } : prev
                      )
                    }
                  />
                </>
              ) : null}
            </div>

            <input
              className="w-full rounded-2xl border border-stone-200 bg-white p-3"
              value={editForm.title}
              onChange={(e) =>
                setEditForm((prev) => (prev ? { ...prev, title: e.target.value } : prev))
              }
            />

            <textarea
              className="min-h-40 w-full rounded-2xl border border-stone-200 bg-white p-3"
              value={editForm.body}
              onChange={(e) =>
                setEditForm((prev) => (prev ? { ...prev, body: e.target.value } : prev))
              }
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void saveRecord(item.id)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-800"
              >
                Save
              </button>
              <button
                onClick={cancelEditing}
                className="rounded-full border border-stone-200 px-5 py-2.5 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void deleteRecord(item.id)}
                className="rounded-full border border-red-200 px-5 py-2.5 text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-1 text-xs text-gray-500">Stage: {item.list}</div>
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {item.priority === "Urgent" || item.priority === "High" ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.priority === "Urgent"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.priority}
                  </span>
                ) : null}
                {canEdit ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(item)}
                      className="rounded-full border border-stone-200 px-3 py-1 text-sm hover:bg-stone-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void deleteRecord(item.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                Notes / Summary
              </div>
              {item.body ? (
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {item.body}
                </pre>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No notes / summary yet.</p>
              )}
            </div>

            {sellerLead ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    Priority
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {item.priority || "Medium"}
                  </div>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    Lead Source
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {item.leadSource || "Not set"}
                  </div>
                </div>
                <div className="rounded-2xl bg-stone-50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                    Net Lead Cost
                  </div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      item.leadCost < 0 ? "text-red-700" : "text-slate-900"
                    }`}
                  >
                    {formatMoney(item.leadCost || 0)}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-stone-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Next Follow-Up Date
                </div>
                <div className="mt-1 font-medium text-slate-800">
                  {formatFixedCstDateTime(item.followUpAt)}
                </div>
              </div>
            </div>
          </>
        )}
      </article>
    );
  }

  if (!isLoggedIn || loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main
      id="top"
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f2e8_0%,#f5f7fb_42%,#eef2f7_100%)] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 rounded-[32px] border border-white/70 bg-white/85 px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur md:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                Lex Ventured & Co CRM
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Records Command Center
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Stage visibility, quick navigation, and cleaner seller tracking in one premium
                records view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Total Records
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{records.length}</div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-700">
                  Seller Leads
                </div>
                <div className="mt-1 text-xl font-semibold text-emerald-900">
                  {sellerRecords.length}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-200/80 pt-4">
            {currentUser?.appScope !== "records-only" ? (
              <>
                <Link
                  href="/crm"
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  Home
                </Link>
                <Link
                  href="/leads"
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  Leads
                </Link>
                <Link
                  href="/deals"
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                >
                  Deals
                </Link>
              </>
            ) : null}
            <Link
              href="/records"
              className="rounded-full border border-slate-900 bg-slate-900 px-4 py-2 font-medium text-white"
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

        <div
          className="lg:grid lg:gap-8"
          style={{ gridTemplateColumns: `minmax(280px, ${sidebarWidth}px) minmax(0, 1fr)` }}
        >
          <aside className="mb-8 lg:sticky lg:top-6 lg:self-start lg:mb-0">
            <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="border-b border-stone-200/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.85),rgba(255,255,255,0.9))] px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Lists</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {records.length} total records grouped by source list.
                    </p>
                  </div>
                  <div className="hidden flex-wrap gap-2 lg:flex">
                    <button
                      onClick={() => setSidebarWidth(280)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        sidebarWidth === 280
                          ? "bg-slate-900 text-white"
                          : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                      }`}
                    >
                      Compact
                    </button>
                    <button
                      onClick={() => setSidebarWidth(320)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        sidebarWidth === 320
                          ? "bg-slate-900 text-white"
                          : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                      }`}
                    >
                      Standard
                    </button>
                    <button
                      onClick={() => setSidebarWidth(380)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                        sidebarWidth === 380
                          ? "bg-slate-900 text-white"
                          : "bg-stone-100 text-slate-600 hover:bg-stone-200"
                      }`}
                    >
                      Wide
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-5 py-5">
                <div className="rounded-2xl border border-stone-200 bg-[#f8f5ee] p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Pipeline Snapshot
                  </h2>
                  <div className="mt-3 space-y-3">
                    {pipelineCards.map((stage) => (
                      <a
                        key={stage.key}
                        href={`#${getListAnchor(stage.key)}`}
                        className={`block rounded-2xl border px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5 ${stage.tone}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{stage.label}</div>
                            <div className="mt-1 text-xs text-slate-500">{stage.count} records</div>
                          </div>
                          <div className={`text-right ${stage.accent}`}>
                            <div className="text-lg font-semibold">
                              {stage.primaryPct === null ? "N/A" : `${stage.primaryPct}%`}
                            </div>
                            <div className="text-[11px] uppercase tracking-[0.2em] opacity-75">
                              {stage.primaryLabel}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <span className="text-slate-500">{stage.secondaryLabel}</span>
                          <span className="font-semibold text-slate-800">
                            {stage.secondaryPct === null ? "N/A" : `${stage.secondaryPct}%`}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-[#f8f5ee] p-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Lead Spend
                  </h2>
                  <div className="mt-3 grid gap-3">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">This week (Sun-Sat)</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatMoney(weeklySpend)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">This month</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatMoney(monthlySpend)}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">Lifetime</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatMoney(lifetimeSpend)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Quick Jump
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="#top"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                    >
                      Jump to Top
                    </a>
                    <a
                      href="#bottom"
                      className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
                    >
                      Jump to Bottom
                    </a>
                  </div>
                  {showStatusGroups ? (
                    <>
                      <a
                        href={`#${getStatusAnchor("Urgent")}`}
                        className="block rounded-2xl border border-red-200 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100"
                      >
                        <div className="text-lg font-semibold text-red-700">Urgent</div>
                        <div className="mt-1 text-sm text-red-700/80">
                          {urgentRecords.length} items
                        </div>
                      </a>
                      <a
                        href={`#${getStatusAnchor("Finished")}`}
                        className="block rounded-2xl border border-green-200 bg-green-50 px-4 py-3 transition-colors hover:bg-green-100"
                      >
                        <div className="text-lg font-semibold text-green-700">Finished</div>
                        <div className="mt-1 text-sm text-green-700/80">
                          {completedRecords.length} items
                        </div>
                      </a>
                    </>
                  ) : null}
                  {orderedLists.map((listName) => (
                    <a
                      key={listName}
                      href={`#${getListAnchor(listName)}`}
                      className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-stone-300 hover:bg-stone-50"
                    >
                      <div className="text-lg font-semibold text-slate-900">{listName}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {groupedRecords[listName].length} items
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            <section className="rounded-[30px] border border-white/80 bg-white/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                    Pipeline
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    Stage Conversion at a Glance
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Percentages now live at the stage level so you can see conversion and fallout
                    without cluttering individual cards.
                  </p>
                </div>
                <div className="text-sm text-slate-500">
                  Seller pipeline only. Buyer / Agent cards stay separate.
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                {pipelineCards.map((stage) => (
                  <div
                    key={stage.key}
                    className={`rounded-[24px] border px-4 py-4 shadow-sm ${stage.tone}`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{stage.label}</div>
                    <div className="mt-1 text-xs text-slate-500">{stage.count} records</div>
                    <div className={`mt-4 text-3xl font-semibold ${stage.accent}`}>
                      {stage.primaryPct === null ? "N/A" : `${stage.primaryPct}%`}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {stage.primaryLabel}
                    </div>
                    <div className="mt-4 border-t border-black/5 pt-3 text-xs text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <span>{stage.secondaryLabel}</span>
                        <span className="font-semibold text-slate-900">
                          {stage.secondaryPct === null ? "N/A" : `${stage.secondaryPct}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {showStatusGroups ? (
              <section id={getStatusAnchor("Urgent")}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-red-700">Urgent</h2>
                  <span className="text-sm text-gray-500">{urgentRecords.length} items</span>
                </div>

                {urgentRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">No urgent records right now.</p>
                ) : (
                  <div className="grid gap-4">{urgentRecords.map((item) => renderRecordCard(item))}</div>
                )}
              </section>
            ) : null}

            {showStatusGroups ? (
              <section id={getStatusAnchor("Finished")}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-green-700">Finished</h2>
                  <span className="text-sm text-gray-500">{completedRecords.length} items</span>
                </div>

                {completedRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">No finished records yet.</p>
                ) : (
                  <div className="grid gap-4">
                    {completedRecords.map((item) => renderRecordCard(item))}
                  </div>
                )}
              </section>
            ) : null}

        {orderedLists.map((listName) => {
          const items = (groupedRecords[listName] || []).filter((record) => {
            if (!showStatusGroups) {
              return true;
            }

            return !isUrgentRecord(record) && !isCompletedRecord(record);
          });

          return (
          <section key={listName} id={getListAnchor(listName)}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">{listName}</h2>
                    <span className="text-sm text-gray-500">{items.length} items</span>
                  </div>

                  <div className="grid gap-4">{items.map((item) => renderRecordCard(item))}</div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
      <div id="bottom" />
    </main>
  );
}
