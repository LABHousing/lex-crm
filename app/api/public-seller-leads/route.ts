import { prisma } from "@/app/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const NOTIFICATION_EMAIL = "info@lexventured.com";

function buildMotivation(
  details?: string,
  timeline?: string,
  email?: string
) {
  const parts: string[] = [];

  if (email?.trim()) {
    parts.push(`Email: ${email.trim()}`);
  }

  if (timeline?.trim()) {
    parts.push(`Timeline: ${timeline.trim()}`);
  }

  if (details?.trim()) {
    parts.push(`Seller notes: ${details.trim()}`);
  }

  return parts.join("\n") || "Public website lead submission";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const name = String(data.name || "").trim();
    const phone = String(data.phone || "").trim();
    const email = String(data.email || "").trim();
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
        motivation: buildMotivation(details, timeline, email),
      },
    });

    let emailSent = false;

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (apiKey && fromEmail) {
      try {
        const resend = new Resend(apiKey);

        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [NOTIFICATION_EMAIL],
          replyTo: email || undefined,
          subject: `New seller lead: ${name} — ${address}`,
          html: `
            <h2>New seller lead</h2>
            <p><strong>CRM Lead ID:</strong> ${lead.id}</p>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email || "Not provided")}</p>
            <p><strong>Property:</strong> ${escapeHtml(address)}</p>
            <p><strong>Timeline:</strong> ${escapeHtml(
              timeline || "Not provided"
            )}</p>
            <p><strong>Details:</strong><br>${escapeHtml(
              details || "Not provided"
            ).replaceAll("\n", "<br>")}</p>
          `,
        });

        if (error) {
          throw new Error(error.message);
        }

        emailSent = true;
      } catch (emailError) {
        console.error(
          "Lead saved, but notification email failed",
          emailError
        );
      }
    } else {
      console.warn(
        "Lead saved, but notification email was skipped because RESEND_API_KEY or RESEND_FROM_EMAIL is missing."
      );
    }

    return Response.json({
      success: true,
      leadId: lead.id,
      emailSent,
    });
  } catch (error) {
    console.error("Failed to create public seller lead", error);

    return Response.json(
      { error: "We could not submit your information." },
      { status: 500 }
    );
  }
}