"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { formatFixedCstDateTime, toFixedCstDateTimeInput } from "@/app/lib/fixed-cst";

type ScheduleCard = {
  id: number;
  dateKey: string;
  type: "call" | "text" | "follow_up" | "offer" | "review";
  leadId: string;
  sellerName: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  reason: string | null;
  suggestedMessage: string | null;
  suggestedCallOpener: string | null;
  dueAt: string | null;
  completed: boolean;
  stage?: string | null;
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  followUpCount?: number | null;
  lastContactOutcome?: string | null;
  notesSummary?: string | null;
  recordPriority?: string | null;
};

type AvailableRecord = {
  id: number;
  list: string;
  title: string;
  body: string | null;
  priority: string;
  followUpAt: string | null;
  leadCost?: number;
  createdAt?: string;
  completed: boolean;
};

type EditForm = {
  sellerName: string;
  phone: string;
  address: string;
  priority: ScheduleCard["priority"];
  type: ScheduleCard["type"];
  lastContactDate: string;
  nextFollowUpDate: string;
  notesSummary: string;
  completed: boolean;
};

const STAGE_OPTIONS = [
  "Dead",
  "Leads",
  "Buyer/Agent",
  "Opportunity",
  "Appointment",
  "Terms Rejected/Follow up",
  "Contract",
  "Closed",
] as const;

const ACTIVE_STAGE_OPTIONS = ["Leads", "Opportunity", "Appointment"] as const;

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
  "Terms Rejected/Follow up",
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

const priorityStyles: Record<string, string> = {
  Urgent: "bg-red-600 text-white",
  High: "bg-orange-100 text-orange-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-gray-100 text-gray-700",
};

const typeLabels: Record<string, string> = {
  call: "Call",
  text: "Text",
  follow_up: "Follow up",
  offer: "Offer",
  review: "Review",
};

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${tone}`}>
        {label}
      </div>
      <div className="mt-3 text-4xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

function ScheduleSection({
  id,
  eyebrow,
  title,
  count,
  tone,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className={`text-xs font-semibold uppercase tracking-[0.3em] ${tone}`}>
            {eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">{title}</h2>
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-slate-600">
          {count} cards
        </div>
      </div>
      {children}
    </section>
  );
}

function priorityRank(card: ScheduleCard) {
  const ranks: Record<string, number> = {
    Urgent: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };

  return ranks[card.priority] ?? 4;
}

function sortCards(cards: ScheduleCard[]) {
  return [...cards].sort((a, b) => {
    const priorityDelta = priorityRank(a) - priorityRank(b);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const aDue = a.nextFollowUpDate
      ? new Date(a.nextFollowUpDate).getTime()
      : a.dueAt
        ? new Date(a.dueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
    const bDue = b.nextFollowUpDate
      ? new Date(b.nextFollowUpDate).getTime()
      : b.dueAt
        ? new Date(b.dueAt).getTime()
        : Number.MAX_SAFE_INTEGER;
    return aDue - bDue;
  });
}

function getCardScheduleAt(card: ScheduleCard) {
  const value = card.nextFollowUpDate || card.dueAt;
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEndOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getEndOfTomorrow() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
}

function buildEditForm(card: ScheduleCard): EditForm {
  return {
    sellerName: card.sellerName || "",
    phone: card.phone || "",
    address: card.address || "",
    priority: card.priority,
    type: card.type,
    lastContactDate: toFixedCstDateTimeInput(card.lastContactDate ?? null),
    nextFollowUpDate: toFixedCstDateTimeInput(card.nextFollowUpDate ?? card.dueAt ?? null),
    notesSummary: card.notesSummary || "",
    completed: card.completed,
  };
}

function getListAnchor(listName: string) {
  return `list-${listName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function getListDisplayName(listName: string) {
  return listName === "Closed" ? "Close" : listName;
}

function getStatusAnchor(statusName: string) {
  return `status-${statusName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function isSellerLeadRecord(record: AvailableRecord) {
  return SELLER_LISTS.includes(record.list as (typeof SELLER_LISTS)[number]);
}

function toPercent(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
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

function getPipelineCards(records: AvailableRecord[]): PipelineCard[] {
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

export default function ScheduleTodayPage() {
  const router = useRouter();
  const { isLoggedIn, isInitialized, currentUser, currentUsername, logout } = useAuth();
  const [cards, setCards] = useState<ScheduleCard[]>([]);
  const [records, setRecords] = useState<AvailableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateKey, setDateKey] = useState("");
  const [editingCardId, setEditingCardId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [movingStageId, setMovingStageId] = useState<number | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(320);

  useEffect(() => {
    if (isInitialized === false || (isInitialized === true && !isLoggedIn)) {
      router.push("/login");
    }
  }, [isInitialized, isLoggedIn, router]);

  useEffect(() => {
    async function fetchCards() {
      try {
        const [scheduleRes, recordsRes] = await Promise.all([
          fetch("/api/schedule-today", { cache: "no-store" }),
          fetch("/api/records", { cache: "no-store" }),
        ]);

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          setCards(data.cards || []);
          setDateKey(data.dateKey || "");
        }

        if (recordsRes.ok) {
          const data = await recordsRes.json();
          setRecords(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch schedule", error);
      } finally {
        setLoading(false);
      }
    }

    if (isLoggedIn) {
      void fetchCards();
    }
  }, [isLoggedIn, currentUser?.role]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function markCompleted(card: ScheduleCard, completed: boolean) {
    try {
      const res = await fetch(`/api/schedule-today/${card.id}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update card");
      }

      const updated = await res.json();
      setCards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error("Failed to update card", error);
      alert("Failed to update schedule card");
    }
  }

  function startEditing(card: ScheduleCard) {
    setEditingCardId(card.id);
    setEditForm(buildEditForm(card));
  }

  function stopEditing() {
    setEditingCardId(null);
    setEditForm(null);
  }

  async function saveCard(cardId: number) {
    const formToSave = editForm;
    if (!formToSave) {
      return;
    }

    try {
      setSavingId(cardId);
      const res = await fetch(`/api/schedule-today/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formToSave,
          dueAt: formToSave.nextFollowUpDate || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save card");
      }

      const updated = await res.json();
      setCards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      stopEditing();
    } catch (error) {
      console.error("Failed to save card", error);
      alert("Failed to save schedule card");
    } finally {
      setSavingId(null);
    }
  }

  async function revisitCard(card: ScheduleCard) {
    try {
      const revisitDueAt = new Date();
      revisitDueAt.setHours(revisitDueAt.getHours() + 2);

      const res = await fetch(`/api/schedule-today/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: false,
          status: "Revisit",
          dueAt: revisitDueAt.toISOString(),
          reason: card.reason
            ? `${card.reason}\nRevisit: no answer yet, try again later today.`
            : "Revisit: no answer yet, try again later today.",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to revisit card");
      }

      const updated = await res.json();
      setCards((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      console.error("Failed to revisit card", error);
      alert("Failed to reopen schedule card");
    }
  }

  async function removeFromSchedule(card: ScheduleCard) {
    if (!confirm("Remove this card from Schedule Today?")) {
      return;
    }

    try {
      const res = await fetch(`/api/schedule-today/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Removed",
          completed: false,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to remove card");
      }

      setCards((prev) => prev.filter((item) => item.id !== card.id));
      if (editingCardId === card.id) {
        stopEditing();
      }
    } catch (error) {
      console.error("Failed to remove card", error);
      alert("Failed to remove card from Schedule Today");
    }
  }

  function parseRecordIdFromLead(leadId: string) {
    if (!leadId.startsWith("record-")) {
      return null;
    }

    const parsed = Number(leadId.replace("record-", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function quickMoveStage(card: ScheduleCard, nextStage: string) {
    const recordId = parseRecordIdFromLead(card.leadId);
    if (!recordId || !nextStage || nextStage === (card.stage || "")) {
      return;
    }

    const needsFollowUp = ACTIVE_STAGE_OPTIONS.includes(
      nextStage as (typeof ACTIVE_STAGE_OPTIONS)[number]
    );
    const fallbackFollowUpAt = needsFollowUp
      ? card.nextFollowUpDate || card.dueAt || new Date(Date.now() + 60 * 60 * 1000).toISOString()
      : null;

    try {
      setMovingStageId(card.id);
      const res = await fetch("/api/records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          list: nextStage,
          followUpAt: fallbackFollowUpAt,
          completed: nextStage === "Closed",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to move stage");
      }

      const scheduleRes = await fetch("/api/schedule-today", { cache: "no-store" });
      if (scheduleRes.ok) {
        const data = await scheduleRes.json();
        setCards(data.cards || []);
        setDateKey(data.dateKey || "");
      }
    } catch (error) {
      console.error("Failed to move stage", error);
      alert(error instanceof Error ? error.message : "Failed to move stage");
    } finally {
      setMovingStageId(null);
    }
  }

  function renderCard(card: ScheduleCard) {
    const isAdminUser = currentUser?.role === "admin";
    const canMarkDone = !card.completed;
    const suggested = card.type === "call" ? card.suggestedCallOpener : card.suggestedMessage;
    const isEditing = editingCardId === card.id && editForm;

    return (
      <article key={card.id} className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  priorityStyles[card.recordPriority || card.priority] || priorityStyles.Medium
                }`}
              >
                {card.recordPriority || card.priority}
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {typeLabels[card.type] || card.type}
              </span>
              {card.stage ? (
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {card.stage}
                </span>
              ) : null}
            </div>
            <h3 className="text-xl font-bold">{card.sellerName || "Unknown seller"}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {[card.phone, card.address].filter(Boolean).join(" | ")}
            </p>
          </div>

          {isAdminUser || canMarkDone ? (
            <div className="flex gap-2">
              {isAdminUser && card.completed ? (
                <button
                  onClick={() => void revisitCard(card)}
                  className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Revisit
                </button>
              ) : canMarkDone ? (
                <button
                  onClick={() => void markCompleted(card, true)}
                  className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Done
                </button>
              ) : null}
              {isAdminUser ? (
                <>
                  <button
                    onClick={() => (isEditing ? stopEditing() : startEditing(card))}
                    className="rounded bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
                  >
                    {isEditing ? "Close" : "Edit"}
                  </button>
                  <button
                    onClick={() => void removeFromSchedule(card)}
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    Remove
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 text-sm text-gray-600">
          {currentUser?.role === "admin" && parseRecordIdFromLead(card.leadId) ? (
            <div className="rounded-xl bg-stone-50 p-4 md:col-span-2 xl:col-span-3">
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
                Stage
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={card.stage || ""}
                  onChange={(event) => void quickMoveStage(card, event.target.value)}
                  disabled={movingStageId === card.id}
                  className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="" disabled>
                    Choose stage
                  </option>
                  {STAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "Closed" ? "Close" : option}
                    </option>
                  ))}
                </select>
                {movingStageId === card.id ? (
                  <span className="text-xs text-slate-500">Updating stage...</span>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="rounded-xl bg-stone-50 p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
              Next Follow-Up
            </div>
            <div className="mt-1 font-medium text-slate-800">
              {formatFixedCstDateTime(card.nextFollowUpDate || card.dueAt || null)}
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 p-4 md:col-span-2 xl:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.2em] text-stone-500">
              Notes / Summary
            </div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {card.notesSummary || "No notes yet."}
            </div>
          </div>
        </div>

        {card.reason ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-bold">Why this is on today&apos;s list</div>
            <p className="mt-1">{card.reason}</p>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
          <div className="font-bold">What to do</div>
          <p className="mt-1">
            {card.type === "call"
              ? "Call first and try to move the seller to the next commitment."
              : card.type === "text"
              ? "Send the suggested text and watch for a reply."
              : card.type === "offer"
              ? "Review numbers and decide whether to send or adjust the offer."
              : card.type === "review"
              ? "Review the lead details and decide the next move."
              : "Follow up and update the record after contact."}
          </p>
        </div>

        {suggested ? (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
            <div className="font-bold">
              {card.type === "call" ? "Suggested call opener" : "Suggested message"}
            </div>
            <p className="mt-1 whitespace-pre-wrap">{suggested}</p>
          </div>
        ) : null}

        {isAdminUser && isEditing ? (
          <div className="mt-4 rounded-xl border border-black/10 bg-[#f8f5ee] p-4">
            <div className="mb-4 text-sm font-bold text-gray-900">Edit card</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={editForm.sellerName}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, sellerName: event.target.value } : prev
                  )
                }
                placeholder="Seller name"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={editForm.phone}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, phone: event.target.value } : prev
                  )
                }
                placeholder="Phone"
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <input
                value={editForm.address}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, address: event.target.value } : prev
                  )
                }
                placeholder="Address"
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <select
                value={editForm.type}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev
                      ? { ...prev, type: event.target.value as ScheduleCard["type"] }
                      : prev
                  )
                }
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="follow_up">Follow up</option>
                <option value="offer">Offer</option>
                <option value="review">Review</option>
              </select>
              <select
                value={editForm.priority}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          priority: event.target.value as ScheduleCard["priority"],
                        }
                      : prev
                  )
                }
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
              <input
                type="datetime-local"
                value={editForm.nextFollowUpDate}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, nextFollowUpDate: event.target.value } : prev
                  )
                }
                className="rounded-lg border px-3 py-2 text-sm"
              />
              <textarea
                value={editForm.notesSummary}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, notesSummary: event.target.value } : prev
                  )
                }
                placeholder="Notes / summary"
                rows={4}
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void saveCard(card.id)}
                disabled={savingId === card.id}
                className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
              >
                {savingId === card.id ? "Saving..." : "Save now"}
              </button>
              <button
                onClick={() =>
                  setEditForm((prev) => (prev ? { ...prev, completed: false } : prev))
                }
                className="rounded border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Keep active
              </button>
              <button
                onClick={stopEditing}
                className="rounded border px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {card.leadId ? (
          <div className="mt-4 text-xs text-gray-500">Lead ID: {card.leadId}</div>
        ) : null}
      </article>
    );
  }

  const activeCards = sortCards(cards.filter((card) => !card.completed));
  const startOfToday = getStartOfToday();
  const endOfToday = getEndOfToday();
  const endOfTomorrow = getEndOfTomorrow();
  const overdueCards = activeCards.filter((card) => {
    const scheduleAt = getCardScheduleAt(card);
    return scheduleAt ? scheduleAt < startOfToday : false;
  });
  const dueTodayCards = activeCards.filter((card) => {
    const scheduleAt = getCardScheduleAt(card);
    return scheduleAt ? scheduleAt >= startOfToday && scheduleAt <= endOfToday : false;
  });
  const nextUpCards = activeCards.filter((card) => {
    const scheduleAt = getCardScheduleAt(card);
    return scheduleAt ? scheduleAt > endOfToday && scheduleAt <= endOfTomorrow : false;
  });
  const laterCards = activeCards.filter((card) => {
    const scheduleAt = getCardScheduleAt(card);
    return !scheduleAt || scheduleAt > endOfTomorrow;
  });
  const openCount = activeCards.length;
  const doneToday = sortCards(cards.filter((card) => card.completed));
  const groupedRecords = useMemo(
    () =>
      records.reduce<Record<string, AvailableRecord[]>>((groups, record) => {
        if (!groups[record.list]) {
          groups[record.list] = [];
        }

        groups[record.list].push(record);
        return groups;
      }, {}),
    [records]
  );
  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase();
  const matchesSidebarSearch = (label: string, items: AvailableRecord[]) => {
    if (!normalizedSidebarSearch) {
      return true;
    }

    const haystack = [
      label,
      ...items.flatMap((item) => [item.title, item.body || "", item.list, item.priority]),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSidebarSearch);
  };
  const sourceLists = LIST_ORDER.filter((listName) => (groupedRecords[listName] || []).length > 0);
  const filteredSourceLists = sourceLists.filter((listName) =>
    matchesSidebarSearch(listName, groupedRecords[listName] || [])
  );
  const sellerRecords = records.filter(isSellerLeadRecord);
  const pipelineCards = useMemo(() => getPipelineCards(sellerRecords), [sellerRecords]);
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  const monthStart = getMonthStart(now);
  const monthEnd = getMonthEnd(now);
  const weeklySpend = sellerRecords
    .filter((record) => {
      if (!record.createdAt) return false;
      const createdAt = new Date(record.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart && createdAt <= weekEnd;
    })
    .reduce((sum, record) => sum + (record.leadCost || 0), 0);
  const monthlySpend = sellerRecords
    .filter((record) => {
      if (!record.createdAt) return false;
      const createdAt = new Date(record.createdAt);
      return !Number.isNaN(createdAt.getTime()) && createdAt >= monthStart && createdAt <= monthEnd;
    })
    .reduce((sum, record) => sum + (record.leadCost || 0), 0);
  const lifetimeSpend = sellerRecords.reduce((sum, record) => sum + (record.leadCost || 0), 0);
  const focusCards = useMemo(
    () => [...overdueCards, ...dueTodayCards, ...nextUpCards, ...laterCards, ...doneToday],
    [overdueCards, dueTodayCards, nextUpCards, laterCards, doneToday]
  );
  const focusCard = focusCards[focusIndex] || null;

  useEffect(() => {
    if (!focusMode) {
      return;
    }

    if (!focusCards.length) {
      if (focusIndex !== 0) {
        setFocusIndex(0);
      }
      return;
    }

    if (focusIndex > focusCards.length - 1) {
      setFocusIndex(focusCards.length - 1);
    }
  }, [focusMode, focusCards.length, focusIndex]);

  if (!isLoggedIn || loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <main id="top" className="min-h-screen bg-[#f6f2ea] p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex justify-between border-b border-black/10 pb-3">
          <h1 className="text-lg font-bold">Lex Ventured & Co CRM</h1>
          <div className="flex flex-wrap items-center gap-5">
            {currentUser?.role === "admin" && currentUser?.appScope !== "records-only" ? (
              <>
                <Link href="/crm" className="font-medium hover:underline">
                  Home
                </Link>
                <Link href="/leads" className="font-medium hover:underline">
                  Leads
                </Link>
                <Link href="/deals" className="font-medium hover:underline">
                  Deals
                </Link>
              </>
            ) : null}
            {currentUser?.role === "admin" ? (
              <Link href="/records" className="font-medium hover:underline">
                Records
              </Link>
            ) : null}
            <Link href="/schedule-today" className="font-medium hover:underline">
              Schedule Today
            </Link>
            {currentUser?.role === "admin" ? (
              <Link href="/agents" className="font-medium hover:underline">
                Agents
              </Link>
            ) : null}
            {currentUser?.role === "admin" ? (
              <Link href="/users" className="font-medium hover:underline">
                Users
              </Link>
            ) : null}
            {currentUsername ? (
              <span className="text-sm text-gray-500">{currentUsername}</span>
            ) : null}
            <button
              onClick={handleLogout}
              className="font-medium text-red-600 hover:underline"
            >
              Logout
            </button>
          </div>
        </div>

        <section className="mb-8 overflow-hidden rounded-3xl bg-[#151515] text-white shadow-lg">
          <div className="grid gap-6 p-8 md:grid-cols-[1fr_280px] md:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#d4b16a]">
                Wholesaler Daily Dashboard
              </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Schedule Today
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">
              Build today&apos;s board yourself or let OpenClaw help. Pick the records that matter
              today, then work them in one place.
            </p>
            {dateKey ? (
              <p className="mt-2 text-sm font-semibold text-[#d4b16a]">{dateKey}</p>
            ) : null}
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <div className="text-sm text-white/60">Active cards today</div>
              <div className="mt-1 text-5xl font-black">{openCount}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-8 pb-6 pt-4">
            <div className="text-sm text-white/70">
              {focusMode
                ? "Focus Mode is ON: one card at a time."
                : "Turn on Focus Mode for one-card workflow."}
            </div>
            <button
              onClick={() => {
                if (!focusMode) {
                  setFocusIndex(0);
                }
                setFocusMode((prev) => !prev);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                focusMode
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-white text-slate-900 hover:bg-stone-100"
              }`}
            >
              {focusMode ? "Exit Focus Mode" : "Focus Mode"}
            </button>
          </div>
        </section>

        <div className={focusMode ? "hidden" : "mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4"}>
          <SummaryStat label="Overdue" value={overdueCards.length} tone="text-rose-700" />
          <SummaryStat label="Due Today" value={dueTodayCards.length} tone="text-red-600" />
          <SummaryStat label="Next Up" value={nextUpCards.length} tone="text-amber-600" />
          <SummaryStat label="Finished" value={doneToday.length} tone="text-emerald-700" />
        </div>

        {focusMode ? (
          <section className="mb-8 rounded-[30px] border border-white/80 bg-white/92 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  Focus Mode
                </div>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {focusCards.length
                    ? `Card ${focusIndex + 1} of ${focusCards.length}`
                    : "No cards available"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFocusIndex((prev) => Math.max(0, prev - 1))}
                  disabled={focusIndex <= 0 || focusCards.length === 0}
                  className="rounded border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setFocusIndex((prev) => Math.min(focusCards.length - 1, prev + 1))
                  }
                  disabled={focusCards.length === 0 || focusIndex >= focusCards.length - 1}
                  className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Next
                </button>
              </div>
            </div>
            {focusCard ? (
              <div className="grid gap-4">{renderCard(focusCard)}</div>
            ) : (
              <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                Nothing to focus on right now.
              </p>
            )}
          </section>
        ) : null}

        <div
          className={focusMode ? "hidden" : "grid gap-8"}
          style={{ gridTemplateColumns: `minmax(0, 1fr) minmax(280px, ${sidebarWidth}px)` }}
        >
          <div className="space-y-8">
            <ScheduleSection
              id={getStatusAnchor("overdue")}
              eyebrow="Urgent"
              title="Overdue"
              count={overdueCards.length}
              tone="text-rose-700"
            >
              <div className="grid gap-4">
                {overdueCards.length ? (
                  overdueCards.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    No overdue cards.
                  </p>
                )}
              </div>
            </ScheduleSection>

            <ScheduleSection
              id={getStatusAnchor("due-today")}
              eyebrow="Today"
              title="Due Today"
              count={dueTodayCards.length}
              tone="text-red-600"
            >
              <div className="grid gap-4">
                {dueTodayCards.length ? (
                  dueTodayCards.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    Nothing due today.
                  </p>
                )}
              </div>
            </ScheduleSection>

            <ScheduleSection
              id={getStatusAnchor("next-up")}
              eyebrow="Next Up"
              title="Coming Up Soon"
              count={nextUpCards.length}
              tone="text-amber-600"
            >
              <div className="grid gap-4">
                {nextUpCards.length ? (
                  nextUpCards.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    Nothing coming up soon.
                  </p>
                )}
              </div>
            </ScheduleSection>

            <ScheduleSection
              id={getStatusAnchor("later")}
              eyebrow="Later"
              title="Future Follow-Ups"
              count={laterCards.length}
              tone="text-slate-500"
            >
              <div className="grid gap-4">
                {laterCards.length ? (
                  laterCards.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    Nothing waiting in the later queue.
                  </p>
                )}
              </div>
            </ScheduleSection>

            <ScheduleSection
              id={getStatusAnchor("finished")}
              eyebrow="Finished"
              title="Finished Today"
              count={doneToday.length}
              tone="text-emerald-700"
            >
              <div className="grid gap-4">
                {doneToday.length ? (
                  doneToday.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    Nothing marked done yet.
                  </p>
                )}
              </div>
            </ScheduleSection>
          </div>

          <aside className="mb-8 self-start lg:sticky lg:top-6 lg:mb-0">
            <div className="overflow-hidden rounded-[30px] border border-white/80 bg-white/92 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              <div className="border-b border-stone-200/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.85),rgba(255,255,255,0.9))] px-5 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Lists</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Synced tracking from records and schedule.
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

              <div className="max-h-[72vh] space-y-5 overflow-y-auto px-5 py-5 lg:max-h-[calc(100vh-10rem)]">
                <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Search
                  </div>
                  <input
                    value={sidebarSearch}
                    onChange={(event) => setSidebarSearch(event.target.value)}
                    placeholder="Search list, record, contact, or status"
                    className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400 focus:bg-white"
                  />
                </div>

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
                      <div className="text-lg font-semibold text-gray-900">${weeklySpend}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">This month</div>
                      <div className="text-lg font-semibold text-gray-900">${monthlySpend}</div>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <div className="text-xs text-gray-500">Lifetime</div>
                      <div className="text-lg font-semibold text-gray-900">${lifetimeSpend}</div>
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
                </div>

                <div className="rounded-2xl border border-stone-200 bg-[#f8f5ee] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Status Sections
                    </div>
                    <div className="text-xs text-stone-400">4 shown</div>
                  </div>
                  <div className="space-y-3">
                    <a
                      href={`#${getStatusAnchor("overdue")}`}
                      className="block rounded-2xl border border-red-200 bg-red-50 px-4 py-3 transition-colors hover:bg-red-100"
                    >
                      <div className="text-lg font-semibold text-red-700">Overdue</div>
                      <div className="mt-1 text-sm text-red-700/80">{overdueCards.length} items</div>
                    </a>
                    <a
                      href={`#${getStatusAnchor("due-today")}`}
                      className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
                    >
                      <div className="text-lg font-semibold text-amber-700">Due Today</div>
                      <div className="mt-1 text-sm text-amber-700/80">{dueTodayCards.length} items</div>
                    </a>
                    <a
                      href={`#${getStatusAnchor("next-up")}`}
                      className="block rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 transition-colors hover:bg-sky-100"
                    >
                      <div className="text-lg font-semibold text-sky-700">Next Up</div>
                      <div className="mt-1 text-sm text-sky-700/80">{nextUpCards.length} items</div>
                    </a>
                    <a
                      href={`#${getStatusAnchor("finished")}`}
                      className="block rounded-2xl border border-green-200 bg-green-50 px-4 py-3 transition-colors hover:bg-green-100"
                    >
                      <div className="text-lg font-semibold text-green-700">Finished</div>
                      <div className="mt-1 text-sm text-green-700/80">{doneToday.length} items</div>
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-[#f8f5ee] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Source Lists
                    </div>
                    <div className="text-xs text-stone-400">{filteredSourceLists.length} shown</div>
                  </div>
                  <div className="space-y-3">
                    {filteredSourceLists.map((listName) => (
                      <a
                        key={listName}
                        href={`#${getListAnchor(listName)}`}
                        className="block rounded-2xl border border-stone-200 bg-white px-4 py-3 transition-colors hover:border-stone-300 hover:bg-stone-50"
                      >
                        <div className="text-lg font-semibold text-slate-900">
                          {getListDisplayName(listName)}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {(groupedRecords[listName] || []).length} items
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Manual add-to-schedule panel intentionally removed for this page. */}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <div id="bottom" />
    </main>
  );
}
