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
    if (dueAt !== undefined) {
      updateData.dueAt = dueAt;
    }

    const card = await prisma.scheduleTodayCard.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return Response.json(card);
  } catch (error) {
    console.error("Failed to update schedule card", error);
    return Response.json({ error: "Failed to update schedule card" }, { status: 500 });
  }
}
