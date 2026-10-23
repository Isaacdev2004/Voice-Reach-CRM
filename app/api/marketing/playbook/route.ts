import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
});

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

export const POST = withApiHandler(async (request) => {
  const body = BodySchema.parse(await request.json());

  if (!resendConfigured()) {
    console.info("[playbook-lead]", body.email, body.name);
    return apiOk({
      ok: true,
      message: "Lead captured (email delivery not configured in this environment).",
    });
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM_EMAIL!.trim();
  const to = SITE_OFFER.supportEmail;
  const text = [
    `Playbook download request`,
    `Name: ${body.name}`,
    `Email: ${body.email}`,
    "",
    "Send the Agent Follow-Up Playbook when ready.",
  ].join("\n");

  const notify = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: body.email,
      subject: `[ARI Playbook] ${body.name}`,
      text,
    }),
  });

  if (!notify.ok) {
    const detail = await notify.text().catch(() => "");
    return apiError(`Could not record request. ${detail.slice(0, 120)}`, { status: 502 });
  }

  const welcome = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [body.email],
      subject: `Your ${SITE_OFFER.playbook.title}`,
      text: [
        `Hi ${body.name.split(" ")[0] || "there"},`,
        "",
        `Thanks for requesting ${SITE_OFFER.playbook.title}.`,
        "",
        "We're putting the final touches on the PDF — you'll get the download link from our team shortly.",
        "",
        `When you're ready to automate follow-up in ARI, start your ${SITE_OFFER.trialDays}-day trial: https://www.myari.io/pricing`,
        "",
        "— The ARI Team",
      ].join("\n"),
    }),
  });

  if (!welcome.ok) {
    console.warn("[playbook-lead] welcome email failed for", body.email);
  }

  return apiOk({ ok: true });
});
