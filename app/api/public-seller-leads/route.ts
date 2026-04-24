import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function buildMotivation(details?: string, timeline?: string) {
  const parts = [];

  if (timeline?.trim()) {
    parts.push(`Timeline: ${timeline.trim()}`);
  }

  if (details?.trim()) {
    parts.push(`Seller notes: ${details.trim()}`);
  }

  return parts.join("\n") || "Public website lead submission";
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const address = String(data.address || "").trim();
    const timeline = String(data.timeline || "").trim();
    const details = String(data.details || "").trim();

    if (!name || !phone || !address) {
      return Response.json(
        { error: "Name, phone, and property address are required." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        address,
        motivation: buildMotivation(details, timeline),
      },
    });

    return Response.json({ success: true, leadId: lead.id });
  } catch (error) {
    console.error("Failed to create public seller lead", error);
    return Response.json(
      { error: "We could not submit your information." },
      { status: 500 }
    );
  }
}
