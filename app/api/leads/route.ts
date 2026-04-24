import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canAccessPage, getAuthenticatedUser, isAdmin } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

type OpenClawLead = {
  id: string;
  stage: string;
  sellerName: string;
  phone: string | null;
  address: string | null;
  source: string;
  status: string;
  motivation: string | null;
  timeline: string | null;
  askingPrice: number | null;
  condition: string | null;
  lastContactAt: string | null;
  lastContactSummary: string | null;
  nextFollowUpAt: string | null;
  followUpCount: number;
  lastContactOutcome: string | null;
  priority: "Low" | "Medium" | "High" | "Urgent" | null;
  notes: string | null;
  offerStatus: string;
};

function isOpenClawAuthorized(req: NextRequest) {
  const apiKey = process.env.OPENCLAW_API_KEY;
  const authHeader = req.headers.get("authorization") || "";

  if (!apiKey || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  return authHeader === `Bearer ${apiKey}`;
}

function extractPhone(value: string) {
  const match = value.match(
    /(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}/
  );

  return match?.[0] ?? null;
}

function stripPhone(value: string) {
  return value
    .replace(
      /(?:\+?1[\s.-]*)?(?:\(\d{3}\)|\d{3})[\s.-]*\d{3}[\s.-]*\d{4}/g,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .replace(/[,\-–.]+$/g, "")
    .trim();
}

function parseCurrency(value: string) {
  const match = value.match(/\$\s*([\d,]+(?:\.\d+)?)/i);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function findField(body: string | null | undefined, label: string) {
  if (!body) {
    return null;
  }

  const regex = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
  const match = body.match(regex);
  return match?.[1]?.trim() || null;
}

function findAddress(body: string | null | undefined) {
  if (!body) {
    return null;
  }

  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (
      /\d/.test(line) &&
      /(ave|avenue|st|street|rd|road|dr|drive|pl|place|blvd|boulevard|ct|court|ln|lane|way|pkwy|parkway|cir|circle|trl|trail|hwy|highway|unit|apt)/i.test(
        line
      )
    ) {
      return line.replace(/^address:\s*/i, "").trim();
    }
  }

  return lines[0] ?? null;
}

function inferMotivation(body: string | null | undefined) {
  if (!body) {
    return null;
  }

  const address = findAddress(body);

  const labeled =
    findField(body, "Motivation") ||
    findField(body, "What’s got you thinking about selling?") ||
    findField(body, "Thought in selling, why?");

  if (labeled) {
    return labeled;
  }

  const lines = body
    .split("\n")
    .map((line) => line.replace(/^[•*\-–]+\s*/, "").trim())
    .filter(Boolean);

  return (
    lines.find((line) => {
      if (address && line.toLowerCase() === address.toLowerCase()) {
        return false;
      }

      return !line.toLowerCase().startsWith("asking");
    }) ?? null
  );
}

function inferCondition(body: string | null | undefined) {
  return findField(body, "Condition");
}

function inferTimeline(body: string | null | undefined) {
  return findField(body, "Timeline");
}

function inferPriority(
  priority: string | null | undefined,
  status: string,
  followUpAt: Date | null
) {
  if (priority && ["Low", "Medium", "High", "Urgent"].includes(priority)) {
    return priority as OpenClawLead["priority"];
  }

  if (status === "Urgent") {
    return "Urgent" as const;
  }

  if (followUpAt && followUpAt.getTime() <= Date.now()) {
    return "High" as const;
  }

  return "Medium" as const;
}

function inferOfferStatus(list: string, status: string) {
  if (list === "Contract") {
    return "Under Contract";
  }

  if (list === "Closed") {
    return "Closed";
  }

  if (list === "Dead") {
    return "Dead";
  }

  if (status === "Finished") {
    return "Finished";
  }

  return "Not Sent";
}

function recordToOpenClawLead(record: {
  id: number;
  list: string;
  title: string;
  body: string | null;
  status: string;
  priority: string;
  followUpCount: number;
  lastContactOutcome: string | null;
  lastFollowedUpAt: Date | null;
  followUpAt: Date | null;
  completed: boolean;
  createdAt: Date;
}): OpenClawLead {
  const phone = extractPhone(record.title) || extractPhone(record.body || "");
  const sellerName = stripPhone(record.title) || record.title;
  const address = findAddress(record.body);

  return {
    id: `record-${record.id}`,
    stage: record.list,
    sellerName,
    phone,
    address,
    source: `Records:${record.list}`,
    status: record.list,
    motivation: inferMotivation(record.body),
    timeline: inferTimeline(record.body),
    askingPrice: parseCurrency(record.body || "") || parseCurrency(record.title),
    condition: inferCondition(record.body),
    lastContactAt: (record.lastFollowedUpAt ?? record.createdAt).toISOString(),
    lastContactSummary: record.body?.trim() || null,
    nextFollowUpAt: record.followUpAt?.toISOString() ?? null,
    followUpCount: record.followUpCount || 0,
    lastContactOutcome: record.lastContactOutcome,
    priority: inferPriority(record.priority, record.status, record.followUpAt),
    notes: record.body,
    offerStatus: inferOfferStatus(record.list, record.status),
  };
}

function legacyLeadToOpenClawLead(lead: {
  id: number;
  name: string;
  phone: string;
  address: string | null;
  motivation: string | null;
  createdAt: Date;
}): OpenClawLead {
  return {
    id: `lead-${lead.id}`,
    stage: "Leads",
    sellerName: lead.name,
    phone: lead.phone,
    address: lead.address,
    source: "Legacy Leads",
    status: "Leads",
    motivation: lead.motivation,
    timeline: null,
    askingPrice: parseCurrency(lead.motivation || ""),
    condition: null,
    lastContactAt: lead.createdAt.toISOString(),
    lastContactSummary: lead.motivation,
    nextFollowUpAt: null,
    followUpCount: 0,
    lastContactOutcome: null,
    priority: "Medium",
    notes: lead.motivation,
    offerStatus: "Not Sent",
  };
}

function applyOpenClawFilters(leads: OpenClawLead[], req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const dueToday = req.nextUrl.searchParams.get("dueToday");
  const overdue = req.nextUrl.searchParams.get("overdue");
  const hot = req.nextUrl.searchParams.get("hot");
  const newlyAdded = req.nextUrl.searchParams.get("new");

  let filtered = leads;

  if (status) {
    const normalized = status.trim().toLowerCase();
    filtered = filtered.filter(
      (lead) => lead.status.trim().toLowerCase() === normalized
    );
  }

  if (dueToday === "true") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    filtered = filtered.filter((lead) => {
      if (!lead.nextFollowUpAt) {
        return false;
      }

      const nextFollowUpTime = new Date(lead.nextFollowUpAt).getTime();
      return nextFollowUpTime >= startOfDay.getTime() && nextFollowUpTime <= endOfDay.getTime();
    });
  }

  if (overdue === "true") {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    filtered = filtered.filter((lead) => {
      if (!lead.nextFollowUpAt) {
        return false;
      }

      return new Date(lead.nextFollowUpAt).getTime() < startOfDay.getTime();
    });
  }

  if (hot === "true") {
    filtered = filtered.filter(
      (lead) =>
        lead.priority === "Urgent" ||
        lead.priority === "High" ||
        lead.stage === "Opportunity"
    );
  }

  if (newlyAdded === "true") {
    const threeDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 3;
    filtered = filtered.filter((lead) => {
      if (!lead.lastContactAt) {
        return false;
      }

      return new Date(lead.lastContactAt).getTime() >= threeDaysAgo;
    });
  }

  return filtered;
}

async function getOpenClawLeads() {
  const [records, legacyLeads] = await Promise.all([
    prisma.record.findMany({
      where: {
        list: {
          in: [
            "Leads",
            "Buyer/Agent",
            "Opportunity",
            "Appointment",
            "Contract",
            "Closed",
            "Dead",
          ],
        },
      },
      orderBy: [{ followUpAt: "asc" }, { createdAt: "desc" }],
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...records.map(recordToOpenClawLead),
    ...legacyLeads.map(legacyLeadToOpenClawLead),
  ];
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (authHeader) {
      if (!isOpenClawAuthorized(req)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      const leads = applyOpenClawFilters(await getOpenClawLeads(), req);

      return Response.json({
        success: true,
        count: leads.length,
        leads,
      });
    }

    const currentUser = await getAuthenticatedUser();

    if (!canAccessPage(currentUser, "leads")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return Response.json(leads);
  } catch (error) {
    console.error("Failed to fetch leads", error);
    return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address || null,
        motivation: data.motivation || null,
      },
    });
    return Response.json(lead);
  } catch (error) {
    console.error("Failed to create lead", error);
    return Response.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    await prisma.lead.delete({
      where: { id: parseInt(id) },
    });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete lead", error);
    return Response.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
