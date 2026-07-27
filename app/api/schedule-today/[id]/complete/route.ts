import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canAccessPage, getAuthenticatedUser } from "@/app/lib/auth";
import { isOpenClawAuthorized } from "@/app/api/schedule-today/route";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/schedule-today/[id]/complete">
) {
  try {
    const hasBearer = Boolean(req.headers.get("authorization"));
    const currentUser = hasBearer ? null : await getAuthenticatedUser();

    if (hasBearer && !isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasBearer && !canAccessPage(currentUser, "schedule")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const data = await req.json();
    const completed = Boolean(data.completed);
    const existingCard = await prisma.scheduleTodayCard.findUnique({
      where: { id: Number(id) },
    });

    if (!existingCard) {
      return Response.json({ error: "Schedule card not found" }, { status: 404 });
    }

    const card = await prisma.scheduleTodayCard.update({
      where: { id: Number(id) },
      data: {
        completed,
        status: completed ? "Finished" : "Queued",
      },
    });

    if (!existingCard.completed && completed && existingCard.leadId.startsWith("record-")) {
      const recordId = Number(existingCard.leadId.replace("record-", ""));
      if (Number.isFinite(recordId)) {
        const existingRecord = await prisma.record.findUnique({
          where: { id: recordId },
        });

        if (existingRecord) {
          await prisma.record.update({
            where: { id: recordId },
            data: {
              lastFollowedUpAt: new Date(),
              followUpCount: existingRecord.followUpCount + 1,
            },
          });
        }
      }
    }

    const recordId = parseRecordId(existingCard.leadId);
    const refreshedRecord =
      recordId !== null
        ? await prisma.record.findUnique({
            where: { id: recordId },
          })
        : null;

    return Response.json({
      ...card,
      sellerName: refreshedRecord ? stripPhone(refreshedRecord.title) || refreshedRecord.title : card.sellerName,
      phone: refreshedRecord
        ? extractPhone(`${refreshedRecord.title} ${refreshedRecord.body || ""}`) ?? card.phone
        : card.phone,
      address: refreshedRecord ? findAddress(refreshedRecord.body) ?? card.address : card.address,
      stage: refreshedRecord?.list ?? null,
      lastContactDate: refreshedRecord?.lastFollowedUpAt?.toISOString() ?? null,
      nextFollowUpDate:
        refreshedRecord?.followUpAt?.toISOString() ?? card.dueAt?.toISOString() ?? null,
      lastContactOutcome: refreshedRecord?.lastContactOutcome ?? null,
      notesSummary: refreshedRecord?.body ?? null,
      recordPriority: refreshedRecord?.priority ?? card.priority,
    });
  } catch (error) {
    console.error("Failed to update schedule card completion", error);
    return Response.json(
      { error: "Failed to update schedule card completion" },
      { status: 500 }
    );
  }
}
