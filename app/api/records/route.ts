import { prisma } from "@/app/lib/prisma";
import { getAuthenticatedUser, isAdmin } from "@/app/lib/auth";
import { parseFixedCstDateTime } from "@/app/lib/fixed-cst";

const ACTIVE_SELLER_LISTS = ["Leads", "Opportunity", "Appointment"] as const;

function requiresFollowUp(list: string) {
  return ACTIVE_SELLER_LISTS.includes(list as (typeof ACTIVE_SELLER_LISTS)[number]);
}

function normalizePriority(value: unknown) {
  const priority = typeof value === "string" ? value : "Medium";
  return ["Low", "Medium", "High", "Urgent"].includes(priority) ? priority : "Medium";
}

function normalizeRecordStatus(value: unknown, completed: boolean, priority: string) {
  if (completed) {
    return "Finished";
  }

  if (priority === "Urgent") {
    return "Urgent";
  }

  if (typeof value === "string" && value.trim()) {
    const nextValue = value.trim();
    if (!["Open", "Completed"].includes(nextValue)) {
      return nextValue;
    }
  }

  return "Active";
}

function validateFollowUpRule(data: {
  list: string;
  followUpAt?: string | null;
}) {
  if (requiresFollowUp(data.list) && !data.followUpAt) {
    return Response.json(
      { error: "Next Follow-Up Date is required for active seller leads." },
      { status: 400 }
    );
  }

  return null;
}

function buildRecordLeadId(id: number) {
  return `record-${id}`;
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

function getTodayDateKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

async function syncRecordToSchedule(record: {
  id: number;
  list: string;
  title: string;
  body: string | null;
  priority: string;
  followUpAt: Date | null;
}) {
  const leadId = buildRecordLeadId(record.id);
  const dateKey = getTodayDateKey();

  if (!requiresFollowUp(record.list)) {
    await prisma.scheduleTodayCard.updateMany({
      where: {
        dateKey,
        leadId,
        type: "follow_up",
      },
      data: {
        completed: true,
        status: "Finished",
        dueAt: record.followUpAt,
        priority: normalizePriority(record.priority),
      },
    });
    return;
  }

  await prisma.scheduleTodayCard.upsert({
    where: {
      dateKey_leadId_type: {
        dateKey,
        leadId,
        type: "follow_up",
      },
    },
    update: {
      sellerName: stripPhone(record.title) || record.title,
      phone: extractPhone(`${record.title} ${record.body || ""}`),
      address: findAddress(record.body),
      priority: normalizePriority(record.priority),
      dueAt: record.followUpAt,
      completed: false,
      status: "Queued",
    },
    create: {
      dateKey,
      leadId,
      type: "follow_up",
      sellerName: stripPhone(record.title) || record.title,
      phone: extractPhone(`${record.title} ${record.body || ""}`),
      address: findAddress(record.body),
      status: "Queued",
      priority: normalizePriority(record.priority),
      reason: null,
      suggestedMessage: null,
      suggestedCallOpener: null,
      dueAt: record.followUpAt,
      completed: false,
      source: "manual",
    },
  });
}

export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.record.findMany({
      where:
        currentUser.recordsScope === "contract-only"
          ? { list: "Contract" }
          : undefined,
      orderBy: [{ list: "asc" }, { createdAt: "desc" }],
    });

    return Response.json(records);
  } catch (error) {
    console.error("Failed to fetch records", error);
    return Response.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const ruleError = validateFollowUpRule(data);

    if (ruleError) {
      return ruleError;
    }

    const parsedFollowUpCount =
      data.followUpCount === "" || data.followUpCount === null || data.followUpCount === undefined
        ? null
        : Number(data.followUpCount);
    const priority = normalizePriority(data.priority);
    const completed = data.list === "Closed" ? true : Boolean(data.completed);
    const followUpCount =
      parsedFollowUpCount !== null && Number.isFinite(parsedFollowUpCount)
        ? parsedFollowUpCount
        : data.lastFollowedUpAt || data.lastContactOutcome
          ? 1
          : 0;

    const record = await prisma.record.create({
      data: {
        externalLeadKey: data.externalLeadKey || null,
        list: data.list,
        title: data.title,
        body: data.body || null,
        status: normalizeRecordStatus(data.status, completed, priority),
        priority,
        leadSource: data.leadSource || null,
        leadCost: Number(data.leadCost) || 0,
        followUpCount,
        lastContactOutcome: data.lastContactOutcome || null,
        lastFollowedUpAt: parseFixedCstDateTime(data.lastFollowedUpAt) ?? null,
        followUpAt: parseFixedCstDateTime(data.followUpAt) ?? null,
        completed,
      },
    });

    await syncRecordToSchedule(record);

    return Response.json(record);
  } catch (error) {
    console.error("Failed to create record", error);
    return Response.json({ error: "Failed to create record" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const existing = await prisma.record.findUnique({
      where: { id: Number(data.id) },
    });

    if (!existing) {
      return Response.json({ error: "Record not found" }, { status: 404 });
    }

    const nextList = data.list || existing.list;
    const nextFollowUpAt =
      Object.prototype.hasOwnProperty.call(data, "followUpAt") && data.followUpAt !== undefined
        ? data.followUpAt
        : existing.followUpAt?.toISOString();
    const ruleError = validateFollowUpRule({
      list: nextList,
      followUpAt: nextFollowUpAt,
    });

    if (ruleError) {
      return ruleError;
    }

    const nextLastFollowedUpAt =
      data.lastFollowedUpAt === undefined
        ? existing.lastFollowedUpAt
        : data.lastFollowedUpAt
          ? parseFixedCstDateTime(data.lastFollowedUpAt) ?? null
          : null;
    const nextLastContactOutcome =
      data.lastContactOutcome === undefined
        ? existing.lastContactOutcome
        : data.lastContactOutcome || null;
    const followUpTouched =
      (data.lastFollowedUpAt !== undefined &&
        `${existing.lastFollowedUpAt?.toISOString() ?? ""}` !==
          `${nextLastFollowedUpAt?.toISOString() ?? ""}`) ||
      (data.lastContactOutcome !== undefined &&
        `${existing.lastContactOutcome ?? ""}` !== `${nextLastContactOutcome ?? ""}`);
    const parsedFollowUpCount =
      data.followUpCount === "" || data.followUpCount === null || data.followUpCount === undefined
        ? null
        : Number(data.followUpCount);
    const priority = normalizePriority(data.priority ?? existing.priority);
    const completed =
      nextList === "Closed"
        ? true
        : data.completed === undefined
          ? existing.completed
          : Boolean(data.completed);
    const followUpCount =
      parsedFollowUpCount !== null && Number.isFinite(parsedFollowUpCount)
        ? parsedFollowUpCount
        : followUpTouched
          ? existing.followUpCount + 1
          : existing.followUpCount;

    const record = await prisma.record.update({
      where: { id: Number(data.id) },
      data: {
        externalLeadKey: data.externalLeadKey ?? existing.externalLeadKey,
        list: nextList,
        title: data.title,
        body: data.body || null,
        status: normalizeRecordStatus(data.status ?? existing.status, completed, priority),
        priority,
        leadSource: data.leadSource || null,
        leadCost: Number(data.leadCost) || 0,
        followUpCount,
        lastContactOutcome: nextLastContactOutcome,
        lastFollowedUpAt: nextLastFollowedUpAt,
        followUpAt: parseFixedCstDateTime(data.followUpAt) ?? null,
        completed,
      },
    });

    await syncRecordToSchedule(record);

    return Response.json(record);
  } catch (error) {
    console.error("Failed to update record", error);
    return Response.json({ error: "Failed to update record" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();

    await prisma.record.delete({
      where: { id: Number(id) },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete record", error);
    return Response.json({ error: "Failed to delete record" }, { status: 500 });
  }
}
