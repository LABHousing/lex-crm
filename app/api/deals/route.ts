import { prisma } from "@/app/lib/prisma";
import { canAccessPage, getAuthenticatedUser, isAdmin } from "@/app/lib/auth";

export async function GET() {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!canAccessPage(currentUser, "deals")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deals = await prisma.deal.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(deals);
  } catch (error) {
    return Response.json({ error: "Failed to fetch deals" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const deal = await prisma.deal.create({
      data: {
        title: data.title,
        leadName: data.leadName,
        buyerName: data.buyerName,
        status: data.status || "Active",
        value: data.value || null,
        notes: data.notes || null,
      },
    });
    return Response.json(deal);
  } catch (error) {
    return Response.json({ error: "Failed to create deal" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    await prisma.deal.delete({
      where: { id: parseInt(id) },
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete deal" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!isAdmin(currentUser)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const deal = await prisma.deal.update({
      where: { id: parseInt(data.id) },
      data: { status: data.status },
    });
    return Response.json(deal);
  } catch (error) {
    return Response.json({ error: "Failed to update deal" }, { status: 500 });
  }
}
