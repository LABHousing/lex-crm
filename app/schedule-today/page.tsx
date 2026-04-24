"use client";

import { useEffect, useState } from "react";
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
  completed: boolean;
};

type EditForm = {
  sellerName: string;
  phone: string;
  address: string;
  priority: ScheduleCard["priority"];
  type: ScheduleCard["type"];
  reason: string;
  suggestedMessage: string;
  suggestedCallOpener: string;
  lastContactDate: string;
  nextFollowUpDate: string;
  lastContactOutcome: string;
  notesSummary: string;
  completed: boolean;
};

type AddCardForm = {
  recordId: string;
  type: ScheduleCard["type"];
  priority: ScheduleCard["priority"];
  nextFollowUpDate: string;
  reason: string;
  suggestedMessage: string;
  suggestedCallOpener: string;
};

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
  eyebrow,
  title,
  count,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  count: number;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
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
    reason: card.reason || "",
    suggestedMessage: card.suggestedMessage || "",
    suggestedCallOpener: card.suggestedCallOpener || "",
    lastContactDate: toFixedCstDateTimeInput(card.lastContactDate ?? null),
    nextFollowUpDate: toFixedCstDateTimeInput(card.nextFollowUpDate ?? card.dueAt ?? null),
    lastContactOutcome: card.lastContactOutcome || "",
    notesSummary: card.notesSummary || "",
    completed: card.completed,
  };
}

function extractPhone(value: string) {
  const match = value.match(/(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/);
  return match ? match[0].trim() : "";
}

function stripPhone(value: string) {
  return value
    .replace(/(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  const [addCardForm, setAddCardForm] = useState<AddCardForm>({
    recordId: "",
    type: "follow_up",
    priority: "Medium",
    nextFollowUpDate: "",
    reason: "",
    suggestedMessage: "",
    suggestedCallOpener: "",
  });
  const [addingCard, setAddingCard] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");

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
          currentUser?.role === "admin"
            ? fetch("/api/records", { cache: "no-store" })
            : Promise.resolve(null),
        ]);

        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          setCards(data.cards || []);
          setDateKey(data.dateKey || "");
        }

        if (recordsRes && recordsRes.ok) {
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
    if (!editForm) {
      return;
    }

    try {
      setSavingId(cardId);
      const res = await fetch(`/api/schedule-today/${cardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          dueAt: editForm.nextFollowUpDate || null,
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

  async function addCardToSchedule() {
    if (!addCardForm.recordId) {
      alert("Choose a record to add.");
      return;
    }

    try {
      setAddingCard(true);
      const res = await fetch("/api/schedule-today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: Number(addCardForm.recordId),
          type: addCardForm.type,
          priority: addCardForm.priority,
          dueAt: addCardForm.nextFollowUpDate || null,
          reason: addCardForm.reason,
          suggestedMessage: addCardForm.suggestedMessage,
          suggestedCallOpener: addCardForm.suggestedCallOpener,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to add card");
      }

      const data = await res.json();
      const scheduleRes = await fetch("/api/schedule-today", { cache: "no-store" });
      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setCards(scheduleData.cards || []);
        setDateKey(scheduleData.dateKey || "");
      } else if (data.card) {
        setCards((prev) => {
          const next = prev.filter(
            (item) => !(item.leadId === data.card.leadId && item.type === data.card.type)
          );
          next.push(data.card);
          return next;
        });
      }

      const selectedRecord = records.find((record) => record.id === Number(addCardForm.recordId));
      setAddCardForm({
        recordId: "",
        type: "follow_up",
        priority: selectedRecord?.priority === "Urgent" ? "Urgent" : "Medium",
        nextFollowUpDate: "",
        reason: "",
        suggestedMessage: "",
        suggestedCallOpener: "",
      });
    } catch (error) {
      console.error("Failed to add schedule card", error);
      alert(error instanceof Error ? error.message : "Failed to add schedule card");
    } finally {
      setAddingCard(false);
    }
  }

  function renderCard(card: ScheduleCard) {
    const canEdit = currentUser?.role === "admin";
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

          {canEdit ? (
            <div className="flex gap-2">
              {card.completed ? (
                <button
                  onClick={() => void revisitCard(card)}
                  className="rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Revisit
                </button>
              ) : (
                <button
                  onClick={() => void markCompleted(card, true)}
                  className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Done
                </button>
              )}
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
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 text-sm text-gray-600">
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

        {isEditing ? (
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
              <input
                value={editForm.lastContactOutcome}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, lastContactOutcome: event.target.value } : prev
                  )
                }
                placeholder="Outcome"
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                value={editForm.reason}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, reason: event.target.value } : prev
                  )
                }
                placeholder="Why this is on the list"
                rows={3}
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
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
              <textarea
                value={editForm.suggestedCallOpener}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, suggestedCallOpener: event.target.value } : prev
                  )
                }
                placeholder="Suggested call opener"
                rows={3}
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
              <textarea
                value={editForm.suggestedMessage}
                onChange={(event) =>
                  setEditForm((prev) =>
                    prev ? { ...prev, suggestedMessage: event.target.value } : prev
                  )
                }
                placeholder="Suggested text"
                rows={3}
                className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void saveCard(card.id)}
                disabled={savingId === card.id}
                className="rounded bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-400"
              >
                {savingId === card.id ? "Saving..." : "Save changes"}
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

  if (!isLoggedIn || loading) {
    return <div className="p-6">Loading...</div>;
  }

  const activeCards = sortCards(cards.filter((card) => !card.completed));
  const endOfToday = getEndOfToday();
  const endOfTomorrow = getEndOfTomorrow();
  const topPriorityCards = activeCards.filter((card) => {
    const scheduleAt = getCardScheduleAt(card);
    return scheduleAt ? scheduleAt <= endOfToday : false;
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
  const filteredRecords = records
    .filter((record) => record.list !== "Buyer/Agent")
    .filter((record) => {
      const haystack = `${record.title} ${record.body || ""} ${record.list}`.toLowerCase();
      return !recordSearch.trim() || haystack.includes(recordSearch.trim().toLowerCase());
    })
    .sort((a, b) => a.title.localeCompare(b.title));
  const selectedRecord = records.find((record) => record.id === Number(addCardForm.recordId));

  return (
    <main className="min-h-screen bg-[#f6f2ea] p-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex justify-between border-b border-black/10 pb-3">
          <h1 className="text-lg font-bold">Lex Ventured & Co CRM</h1>
          <div className="flex flex-wrap items-center gap-5">
            {currentUser?.appScope !== "records-only" ? (
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
            <Link href="/records" className="font-medium hover:underline">
              Records
            </Link>
            <Link href="/schedule-today" className="font-medium hover:underline">
              Schedule Today
            </Link>
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
        </section>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Top Priority" value={topPriorityCards.length} tone="text-red-600" />
          <SummaryStat label="Next Up" value={nextUpCards.length} tone="text-amber-600" />
          <SummaryStat label="Later" value={laterCards.length} tone="text-slate-500" />
          <SummaryStat label="Finished" value={doneToday.length} tone="text-emerald-700" />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <ScheduleSection
              eyebrow="Top Priority"
              title="Due Today & Overdue"
              count={topPriorityCards.length}
              tone="text-red-600"
            >
              <div className="grid gap-4">
                {topPriorityCards.length ? (
                  topPriorityCards.map(renderCard)
                ) : (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-slate-500">
                    Nothing due today or overdue.
                  </p>
                )}
              </div>
            </ScheduleSection>

            <ScheduleSection
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

          {currentUser?.role === "admin" ? (
            <aside className="h-fit rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)] xl:sticky xl:top-6">
              <div className="flex flex-col gap-3 border-b border-stone-200 pb-5">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Manual Control
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Add a record to today&apos;s board
                </h2>
                <p className="text-sm text-slate-600">
                  Pull a record into Schedule Today without changing your existing card setup.
                </p>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-slate-600">
                  Records loaded:{" "}
                  <span className="font-semibold text-slate-900">{filteredRecords.length}</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <input
                  value={recordSearch}
                  onChange={(event) => setRecordSearch(event.target.value)}
                  placeholder="Search records by name, phone, address, or list"
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm"
                />
                <select
                  value={addCardForm.recordId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const nextRecord = records.find((record) => record.id === Number(nextId));
                    setAddCardForm((prev) => ({
                      ...prev,
                      recordId: nextId,
                      priority:
                        nextRecord?.priority === "Urgent"
                          ? "Urgent"
                          : (nextRecord?.priority as ScheduleCard["priority"]) || prev.priority,
                    }));
                  }}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="">Choose a record</option>
                  {filteredRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {stripPhone(record.title) || record.title} | {record.list}
                    </option>
                  ))}
                </select>

                {selectedRecord ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">
                      {stripPhone(selectedRecord.title) || selectedRecord.title}
                    </div>
                    <div className="mt-1">
                      {[extractPhone(selectedRecord.title), selectedRecord.list]
                        .filter(Boolean)
                        .join(" | ")}
                    </div>
                    {selectedRecord.body ? (
                      <div className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-600">
                        {selectedRecord.body}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <select
                  value={addCardForm.type}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({
                      ...prev,
                      type: event.target.value as ScheduleCard["type"],
                    }))
                  }
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="call">Call</option>
                  <option value="text">Text</option>
                  <option value="follow_up">Follow up</option>
                  <option value="offer">Offer</option>
                  <option value="review">Review</option>
                </select>
                <select
                  value={addCardForm.priority}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({
                      ...prev,
                      priority: event.target.value as ScheduleCard["priority"],
                    }))
                  }
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <input
                  type="datetime-local"
                  value={addCardForm.nextFollowUpDate}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({
                      ...prev,
                      nextFollowUpDate: event.target.value,
                    }))
                  }
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-1"
                />
                <textarea
                  value={addCardForm.reason}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({ ...prev, reason: event.target.value }))
                  }
                  placeholder="Why this belongs on today’s board"
                  rows={3}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-1"
                />
                <textarea
                  value={addCardForm.suggestedCallOpener}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({
                      ...prev,
                      suggestedCallOpener: event.target.value,
                    }))
                  }
                  placeholder="Suggested call opener"
                  rows={3}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-1"
                />
                <textarea
                  value={addCardForm.suggestedMessage}
                  onChange={(event) =>
                    setAddCardForm((prev) => ({ ...prev, suggestedMessage: event.target.value }))
                  }
                  placeholder="Suggested text"
                  rows={3}
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm md:col-span-2 xl:col-span-1"
                />
                <button
                  onClick={() => void addCardToSchedule()}
                  disabled={addingCard}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-black disabled:bg-slate-400 md:col-span-2 xl:col-span-1"
                >
                  {addingCard ? "Adding..." : "Add to Schedule Today"}
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}
