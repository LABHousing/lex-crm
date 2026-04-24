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

    const card = await prisma.scheduleTodayCard.update({
      where: { id: Number(id) },
      data: {
        completed,
        status: completed ? "Finished" : "Queued",
      },
    });

    return Response.json(card);
  } catch (error) {
    console.error("Failed to update schedule card completion", error);
    return Response.json(
      { error: "Failed to update schedule card completion" },
      { status: 500 }
    );
  }
}
