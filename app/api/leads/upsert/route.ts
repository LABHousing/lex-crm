import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";

const SELLER_STAGES = ["Leads", "Opportunity", "Appointment", "Contract", "Closed", "Dead"] as const;
const ACTIVE_STAGES = ["Leads", "Opportunity", "Appointment"] as const;

type UpsertLeadPayload = {
  id?: string;
  externalLeadKey?: string;
  sellerName: string;
  phone?: string | null;
  address?: string | null;
  stage?: string;
  leadSource?: string | null;
  priority?: string | null;
  notes?: string | null;
  summary?: string | null;
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  followUpCount?: number | string | null;
  lastContactOutcome?: string | null;
};

function isOpenClawAuthorized(req: NextRequest) {
  const apiKey = process.env.OPENCLAW_API_KEY;
  const authHeader = req.headers.get("authorization") || "";

  if (!apiKey || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  return authHeader === `Bearer ${apiKey}`;
}

function normalizeStage(stage: string | undefined) {
  if (stage && SELLER_STAGES.includes(stage as (typeof SELLER_STAGES)[number])) {
    return stage;
  }

  return "Leads";
}

function normalizePriority(priority: string | null | undefined) {
  if (priority && ["Low", "Medium", "High", "Urgent"].includes(priority)) {
    return priority;
  }

  return "Medium";
}

function requiresFollowUp(stage: string) {
  return ACTIVE_STAGES.includes(stage as (typeof ACTIVE_STAGES)[number]);
}

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function buildTitle(sellerName: string, phone?: string | null) {
  return [sellerName, phone].filter(Boolean).join(" ").trim();
}

function buildBody(payload: UpsertLeadPayload) {
  return [payload.address, payload.summary, payload.notes].filter(Boolean).join("\n\n") || null;
}

async function findExistingRecord(payload: UpsertLeadPayload) {
  if (payload.id?.startsWith("record-")) {
    const numericId = Number(payload.id.replace("record-", ""));
    if (Number.isFinite(numericId)) {
      const byId = await prisma.record.findUnique({ where: { id: numericId } });
      if (byId) return byId;
    }
  }

  if (payload.externalLeadKey) {
    const byExternalKey = await prisma.record.findUnique({
      where: { externalLeadKey: payload.externalLeadKey },
    });
    if (byExternalKey) return byExternalKey;
  }

  const candidates = await prisma.record.findMany({
    where: {
      list: {
        in: [...SELLER_STAGES],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const incomingPhone = normalizePhone(payload.phone);
  const incomingAddress = (payload.address || "").trim().toLowerCase();
  const incomingName = payload.sellerName.trim().toLowerCase();

  return (
    candidates.find((candidate) => {
      const candidatePhone = normalizePhone(candidate.title + " " + (candidate.body || ""));
      const candidateBody = (candidate.body || "").toLowerCase();
      const candidateTitle = candidate.title.toLowerCase();

      if (incomingPhone && candidatePhone && candidatePhone.includes(incomingPhone)) {
        return true;
      }

      if (
        incomingAddress &&
        candidateBody.includes(incomingAddress) &&
        (candidateTitle.includes(incomingName) || incomingName.includes(candidateTitle))
      ) {
        return true;
      }

      return false;
    }) || null
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isOpenClawAuthorized(req)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const payloads = Array.isArray(body?.leads) ? body.leads : Array.isArray(body) ? body : [body];

    const results = [];

    for (const rawPayload of payloads) {
      const payload = rawPayload as UpsertLeadPayload;
      const stage = normalizeStage(payload.stage);
      const nextFollowUpDate = payload.nextFollowUpDate || null;

      if (requiresFollowUp(stage) && !nextFollowUpDate) {
        return Response.json(
          {
            error: `Next Follow-Up Date is required for active lead stage "${stage}".`,
          },
          { status: 400 }
        );
      }

      const existing = await findExistingRecord(payload);
      const nextLastContactDate = payload.lastContactDate ? new Date(payload.lastContactDate) : null;
      const nextOutcome = payload.lastContactOutcome || null;
      const followUpTouched =
        (!!nextLastContactDate &&
          `${existing?.lastFollowedUpAt?.toISOString() ?? ""}` !==
            `${nextLastContactDate.toISOString()}`) ||
        (!!nextOutcome && `${existing?.lastContactOutcome ?? ""}` !== nextOutcome);

      const record = existing
        ? await prisma.record.update({
            where: { id: existing.id },
            data: {
              externalLeadKey: payload.externalLeadKey ?? existing.externalLeadKey,
              list: stage,
              title: buildTitle(payload.sellerName, payload.phone) || existing.title,
              body: buildBody(payload) ?? existing.body,
              priority: normalizePriority(payload.priority ?? existing.priority),
              leadSource: payload.leadSource ?? existing.leadSource,
              followUpCount:
                payload.followUpCount !== undefined &&
                  payload.followUpCount !== null &&
                  payload.followUpCount !== "" &&
                  Number.isFinite(Number(payload.followUpCount))
                  ? Number(payload.followUpCount)
                  : followUpTouched
                    ? existing.followUpCount + 1
                    : existing.followUpCount,
              lastContactOutcome: nextOutcome ?? existing.lastContactOutcome,
              lastFollowedUpAt: nextLastContactDate ?? existing.lastFollowedUpAt,
              followUpAt: nextFollowUpDate ? new Date(nextFollowUpDate) : existing.followUpAt,
              completed: stage === "Closed",
            },
          })
        : await prisma.record.create({
            data: {
              externalLeadKey: payload.externalLeadKey || payload.id || null,
              list: stage,
              title: buildTitle(payload.sellerName, payload.phone) || payload.sellerName,
              body: buildBody(payload),
              priority: normalizePriority(payload.priority),
              leadSource: payload.leadSource || null,
              followUpCount:
                payload.followUpCount !== undefined &&
                  payload.followUpCount !== null &&
                  payload.followUpCount !== "" &&
                  Number.isFinite(Number(payload.followUpCount))
                  ? Number(payload.followUpCount)
                  : nextLastContactDate || nextOutcome
                    ? 1
                    : 0,
              lastContactOutcome: nextOutcome,
              lastFollowedUpAt: nextLastContactDate,
              followUpAt: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
              completed: stage === "Closed",
            },
          });

      results.push(record);
    }

    return Response.json({
      success: true,
      count: results.length,
      records: results,
    });
  } catch (error) {
    console.error("Failed to upsert leads", error);
    return Response.json({ error: "Failed to upsert leads" }, { status: 500 });
  }
}
