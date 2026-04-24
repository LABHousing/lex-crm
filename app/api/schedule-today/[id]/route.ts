import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAuthenticatedUser, isAdmin } from "@/app/lib/auth";
import { isOpenClawAuthorized } from "@/app/api/schedule-today/route";

export const dynamic = "force-dynamic";

const allowedTypes = new Set(["call", "text", "follow_up", "offer", "review"]);
const allowedPriorities = new Set(["Low", "Medium", "High", "Urgent"]);

function normalizeDueAt(value: unknown) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseDateOnly(value: unknown) {
  if (value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseRecordId(leadId: string) {
  if (!leadId.startsWith("record-")) {
    return null;
  }

  const parsed = Number(leadId.replace("record-", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function buildRecordTitle(sellerName: string | null, phone: string | null, fallback: string) {
  const normalizedSeller = sellerName?.trim() || null;
  const normalizedPhone = phone?.trim() || null;

  const nextTitle =
    normalizedSeller && normalizedPhone && normalizedSeller.includes(normalizedPhone)
      ? normalizedSeller
      : [normalizedSeller, normalizedPhone].filter(Boolean).join(" ").trim();

  return nextTitle || fallback;
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

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/schedule-today/[id]">
) {
  try {
    const hasBearer = Boolean(req.headers.get("authorization"));
    const currentUser = hasBearer ? null : await getAuthenticatedUser();

    if (hasBearer && !isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasBearer && !isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const data = await req.json();
    const existingCard = await prisma.scheduleTodayCard.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCard) {
      return Response.json({ error: "Schedule card not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof data.sellerName === "string") {
      updateData.sellerName = data.sellerName.trim() || null;
    }

    if (typeof data.phone === "string") {
      updateData.phone = data.phone.trim() || null;
    }

    if (typeof data.address === "string") {
      updateData.address = data.address.trim() || null;
    }

    if (typeof data.status === "string") {
      updateData.status = data.status.trim() || "Queued";
    }

    if (typeof data.reason === "string") {
      updateData.reason = data.reason.trim() || null;
    }

    if (typeof data.suggestedMessage === "string") {
      updateData.suggestedMessage = data.suggestedMessage.trim() || null;
    }

    if (typeof data.suggestedCallOpener === "string") {
      updateData.suggestedCallOpener = data.suggestedCallOpener.trim() || null;
    }

    if (typeof data.completed === "boolean") {
      updateData.completed = data.completed;
      if (!("status" in updateData)) {
        updateData.status = data.completed ? "Finished" : "Queued";
      }
    }

    if (typeof data.type === "string" && allowedTypes.has(data.type)) {
      updateData.type = data.type;
    }

    if (typeof data.priority === "string" && allowedPriorities.has(data.priority)) {
      updateData.priority = data.priority;
    }

    const dueAt = normalizeDueAt(data.dueAt);

    const recordId = parseRecordId(existingCard.leadId);
    if (recordId !== null) {
      const existingRecord = await prisma.record.findUnique({
        where: { id: recordId },
      });

      if (existingRecord) {
        const nextLastContactDate = parseDateOnly(data.lastContactDate);
        const nextFollowUpDate = parseDateOnly(data.nextFollowUpDate);
        const sharedFollowUpAt =
          nextFollowUpDate !== undefined
            ? nextFollowUpDate
            : dueAt !== undefined
              ? dueAt
              : existingRecord.followUpAt;
        const nextPriority =
          typeof data.priority === "string" && allowedPriorities.has(data.priority)
            ? data.priority
            : existingRecord.priority;
        const nextNotesSummary =
          typeof data.notesSummary === "string" ? data.notesSummary.trim() || null : existingRecord.body;
        const nextTitle = buildRecordTitle(
          typeof data.sellerName === "string" ? data.sellerName.trim() || null : existingCard.sellerName,
          typeof data.phone === "string" ? data.phone.trim() || null : existingCard.phone,
          existingRecord.title
        );

        const followUpTouched =
          nextLastContactDate !== undefined &&
          `${existingRecord.lastFollowedUpAt?.toISOString() ?? ""}` !==
            `${nextLastContactDate?.toISOString() ?? ""}`;

        updateData.dueAt = sharedFollowUpAt;

        await prisma.record.update({
          where: { id: recordId },
          data: {
            title: nextTitle,
            body: nextNotesSummary,
            priority: nextPriority,
            lastContactOutcome:
              typeof data.lastContactOutcome === "string"
                ? data.lastContactOutcome.trim() || null
                : existingRecord.lastContactOutcome,
            lastFollowedUpAt:
              nextLastContactDate !== undefined ? nextLastContactDate : existingRecord.lastFollowedUpAt,
            followUpAt: sharedFollowUpAt,
            followUpCount: followUpTouched
              ? existingRecord.followUpCount + 1
              : existingRecord.followUpCount,
          },
        });
      } else if (dueAt !== undefined) {
        updateData.dueAt = dueAt;
      }
    } else if (dueAt !== undefined) {
      updateData.dueAt = dueAt;
    }

    const card = await prisma.scheduleTodayCard.update({
      where: { id: Number(id) },
      data: updateData,
    });

    const refreshedCard = await prisma.scheduleTodayCard.findUnique({
      where: { id: Number(id) },
    });
    const refreshedRecord =
      recordId !== null
        ? await prisma.record.findUnique({
            where: { id: recordId },
          })
        : null;

    return Response.json(
      refreshedCard
        ? {
            ...refreshedCard,
            sellerName: refreshedRecord
              ? stripPhone(refreshedRecord.title) || refreshedRecord.title
              : refreshedCard.sellerName,
            phone: refreshedRecord
              ? extractPhone(`${refreshedRecord.title} ${refreshedRecord.body || ""}`) ??
                refreshedCard.phone
              : refreshedCard.phone,
            address: refreshedRecord
              ? findAddress(refreshedRecord.body) ?? refreshedCard.address
              : refreshedCard.address,
            stage: refreshedRecord?.list ?? null,
            lastContactDate:
              refreshedRecord?.lastFollowedUpAt?.toISOString() ?? null,
            nextFollowUpDate:
              refreshedRecord?.followUpAt?.toISOString() ??
              refreshedCard.dueAt?.toISOString() ??
              null,
            lastContactOutcome: refreshedRecord?.lastContactOutcome ?? null,
            notesSummary: refreshedRecord?.body ?? null,
            recordPriority: refreshedRecord?.priority ?? refreshedCard.priority,
          }
        : card
    );
  } catch (error) {
    console.error("Failed to update schedule card", error);
    return Response.json({ error: "Failed to update schedule card" }, { status: 500 });
  }
}
