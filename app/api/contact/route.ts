import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(8000),
});

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

export const POST = withApiHandler(async (request) => {
  const body = BodySchema.parse(await request.json());

  if (!resendConfigured()) {
    return apiError(
      "Contact delivery is not configured yet. Email us directly at hello@myari.io.",
      { status: 503, code: "contact_not_configured" },
    );
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM_EMAIL!.trim();
  const to = SITE_OFFER.supportEmail;
  const text = [
    `Name: ${body.name}`,
    `Email: ${body.email}`,
    `Subject: ${body.subject}`,
    "",
    body.message,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: body.email,
      subject: `[ARI Contact] ${body.subject}`,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return apiError(`Could not send message. ${detail.slice(0, 120)}`, { status: 502 });
  }

  return apiOk({ ok: true });
});
