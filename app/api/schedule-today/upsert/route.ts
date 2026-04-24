import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDateKey, isOpenClawAuthorized } from "@/app/api/schedule-today/route";

export const dynamic = "force-dynamic";

type ScheduleCardInput = Record<string, unknown>;

const CARD_TYPES = new Set(["call", "text", "follow_up", "offer", "review"]);
const PRIORITIES = new Set(["Low", "Medium", "High", "Urgent"]);

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeType(value: unknown) {
  const type = cleanString(value)?.toLowerCase();
  return type && CARD_TYPES.has(type) ? type : "follow_up";
}

function normalizePriority(value: unknown) {
  const priority = cleanString(value);
  return priority && PRIORITIES.has(priority) ? priority : "Medium";
}

function normalizeCardData(data: ScheduleCardInput) {
  const leadId = cleanString(data.leadId);
  const type = normalizeType(data.type);

  if (!leadId) {
    throw new Error("leadId is required");
  }

  return {
    dateKey: getDateKey(),
    type,
    leadId,
    sellerName: cleanString(data.sellerName),
    phone: cleanString(data.phone),
    address: cleanString(data.address),
    status: cleanString(data.status) || "Queued",
    priority: normalizePriority(data.priority),
    reason: cleanString(data.reason),
    suggestedMessage: cleanString(data.suggestedMessage),
    suggestedCallOpener: cleanString(data.suggestedCallOpener),
    dueAt: parseDate(data.dueAt),
    completed: Boolean(data.completed),
    source: "openclaw",
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const inputCards: ScheduleCardInput[] = Array.isArray(data) ? data : data.cards;

    if (!Array.isArray(inputCards)) {
      return Response.json({ error: "Expected an array of cards" }, { status: 400 });
    }

    const saved = await Promise.all(
      inputCards.map((input) => {
        const card = normalizeCardData(input);

        return prisma.scheduleTodayCard.upsert({
          where: {
            dateKey_leadId_type: {
              dateKey: card.dateKey,
              leadId: card.leadId,
              type: card.type,
            },
          },
          update: card,
          create: card,
        });
      })
    );

    return Response.json({
      success: true,
      dateKey: getDateKey(),
      count: saved.length,
      cards: saved,
    });
  } catch (error) {
    console.error("Failed to upsert schedule cards", error);
    const message = error instanceof Error ? error.message : "Failed to upsert schedule cards";
    const status = message.includes("required") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
