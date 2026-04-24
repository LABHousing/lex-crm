import { NextRequest } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getAuthenticatedUser, isAdmin } from "@/app/lib/auth";
import { isOpenClawAuthorized } from "@/app/api/schedule-today/route";

export const dynamic = "force-dynamic";

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

    if (!hasBearer && !isAdmin(currentUser)) {
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

    return Response.json(card);
  } catch (error) {
    console.error("Failed to update schedule card completion", error);
    return Response.json(
      { error: "Failed to update schedule card completion" },
      { status: 500 }
    );
  }
}
