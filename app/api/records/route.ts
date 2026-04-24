import { prisma } from "@/app/lib/prisma";
import { getAuthenticatedUser, isAdmin } from "@/app/lib/auth";

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
        lastFollowedUpAt: data.lastFollowedUpAt ? new Date(data.lastFollowedUpAt) : null,
        followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
        completed,
      },
    });

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
          ? new Date(data.lastFollowedUpAt)
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
        followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
        completed,
      },
    });

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
