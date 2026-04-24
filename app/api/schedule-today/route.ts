import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canAccessPage, getAuthenticatedUser, isAdmin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const SCHEDULE_TIME_ZONE = "America/Chicago";

export function getDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHEDULE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function isOpenClawAuthorized(req: NextRequest) {
  const apiKey = process.env.OPENCLAW_API_KEY;
  const authHeader = req.headers.get("authorization") || "";

  return Boolean(apiKey) && authHeader === `Bearer ${apiKey}`;
}

function parseRecordId(leadId: string) {
  if (!leadId.startsWith("record-")) {
    return null;
  }

  const parsed = Number(leadId.replace("record-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractPhone(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/);
  return match ? match[0].trim() : null;
}

function stripPhone(value: string | null | undefined) {
  if (!value) return null;
  return value
    .replace(/(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function findAddress(body: string | null | undefined) {
  if (!body) return null;
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines[0] || null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const CARD_TYPES = new Set(["call", "text", "follow_up", "offer", "review"]);
const PRIORITIES = new Set(["Low", "Medium", "High", "Urgent"]);

export async function GET(req: NextRequest) {
  try {
    const hasBearer = Boolean(req.headers.get("authorization"));
    const currentUser = hasBearer ? null : await getAuthenticatedUser();

    if (hasBearer && !isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasBearer && !canAccessPage(currentUser, "schedule")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateKey = req.nextUrl.searchParams.get("dateKey") || getDateKey();
    const cards = await prisma.scheduleTodayCard.findMany({
      where: { dateKey },
      orderBy: [{ completed: "asc" }, { dueAt: "asc" }, { priority: "desc" }],
    });
    const recordIds = cards
      .map((card) => parseRecordId(card.leadId))
      .filter((value): value is number => value !== null);
    const linkedRecords = recordIds.length
      ? await prisma.record.findMany({
          where: { id: { in: recordIds } },
          select: {
            id: true,
            list: true,
            priority: true,
            followUpCount: true,
            lastContactOutcome: true,
            lastFollowedUpAt: true,
            followUpAt: true,
            body: true,
            createdAt: true,
          },
        })
      : [];
    const linkedRecordMap = new Map(linkedRecords.map((record) => [record.id, record]));
    const enrichedCards = cards.map((card) => {
      const recordId = parseRecordId(card.leadId);
      const linkedRecord = recordId ? linkedRecordMap.get(recordId) : null;

      return {
        ...card,
        stage: linkedRecord?.list ?? null,
        lastContactDate:
          linkedRecord?.lastFollowedUpAt?.toISOString() ??
          linkedRecord?.createdAt?.toISOString() ??
          null,
        nextFollowUpDate: linkedRecord?.followUpAt?.toISOString() ?? card.dueAt?.toISOString() ?? null,
        followUpCount: linkedRecord?.followUpCount ?? null,
        lastContactOutcome: linkedRecord?.lastContactOutcome ?? null,
        notesSummary: linkedRecord?.body ?? null,
        recordPriority: linkedRecord?.priority ?? card.priority,
      };
    });

    return Response.json({
      success: true,
      dateKey,
      count: enrichedCards.length,
      cards: enrichedCards,
    });
  } catch (error) {
    console.error("Failed to fetch schedule cards", error);
    return Response.json({ error: "Failed to fetch schedule cards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const hasBearer = Boolean(req.headers.get("authorization"));
    const currentUser = hasBearer ? null : await getAuthenticatedUser();

    if (hasBearer && !isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasBearer && !isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const dateKey = getDateKey();
    const recordId = Number(data.recordId);
    const record = Number.isFinite(recordId)
      ? await prisma.record.findUnique({ where: { id: recordId } })
      : null;

    if (!record) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    if (record.list === "Buyer/Agent") {
      return Response.json(
        { error: "Buyer / Agent records cannot be added to Schedule Today." },
        { status: 400 }
      );
    }

    const type =
      typeof data.type === "string" && CARD_TYPES.has(data.type) ? data.type : "follow_up";
    const priority =
      typeof data.priority === "string" && PRIORITIES.has(data.priority)
        ? data.priority
        : record.priority && PRIORITIES.has(record.priority)
          ? record.priority
          : "Medium";
    const dueAt = parseDate(data.dueAt);
    const leadId = `record-${record.id}`;
    const sellerName = stripPhone(record.title) || record.title;
    const phone = extractPhone(`${record.title} ${record.body || ""}`);
    const address = findAddress(record.body);

    const card = await prisma.scheduleTodayCard.upsert({
      where: {
        dateKey_leadId_type: {
          dateKey,
          leadId,
          type,
        },
      },
      update: {
        sellerName,
        phone,
        address,
        priority,
        dueAt,
        completed: false,
        status: "Queued",
        source: hasBearer ? "openclaw" : "manual",
        reason: typeof data.reason === "string" && data.reason.trim() ? data.reason.trim() : null,
        suggestedMessage:
          typeof data.suggestedMessage === "string" && data.suggestedMessage.trim()
            ? data.suggestedMessage.trim()
            : null,
        suggestedCallOpener:
          typeof data.suggestedCallOpener === "string" && data.suggestedCallOpener.trim()
            ? data.suggestedCallOpener.trim()
            : null,
      },
      create: {
        dateKey,
        leadId,
        type,
        sellerName,
        phone,
        address,
        priority,
        dueAt,
        completed: false,
        status: "Queued",
        source: hasBearer ? "openclaw" : "manual",
        reason: typeof data.reason === "string" && data.reason.trim() ? data.reason.trim() : null,
        suggestedMessage:
          typeof data.suggestedMessage === "string" && data.suggestedMessage.trim()
            ? data.suggestedMessage.trim()
            : null,
        suggestedCallOpener:
          typeof data.suggestedCallOpener === "string" && data.suggestedCallOpener.trim()
            ? data.suggestedCallOpener.trim()
            : null,
      },
    });

    await prisma.record.update({
      where: { id: record.id },
      data: {
        priority,
        followUpAt: dueAt ?? record.followUpAt,
      },
    });

    return Response.json({ success: true, card });
  } catch (error) {
    console.error("Failed to create schedule card", error);
    return Response.json({ error: "Failed to create schedule card" }, { status: 500 });
  }
}
