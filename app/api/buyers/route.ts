import { prisma } from "@/app/lib/prisma";

export async function GET() {
  try {
    const buyers = await prisma.buyer.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(buyers);
  } catch (error) {
    return Response.json({ error: "Failed to fetch buyers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const buyer = await prisma.buyer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        budget: data.budget || null,
        notes: data.notes || null,
      },
    });
    return Response.json(buyer);
  } catch (error) {
    return Response.json({ error: "Failed to create buyer" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.buyer.delete({
      where: { id: parseInt(id) },
    });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete buyer" }, { status: 500 });
  }
}
