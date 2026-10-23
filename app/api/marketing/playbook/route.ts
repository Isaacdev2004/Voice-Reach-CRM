import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { apiError, apiOk } from "@/lib/api-response";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import {
  PLAYBOOK_ATTACHMENT_NAME,
  PLAYBOOK_FILE,
} from "@/lib/marketing/playbook";
import { z } from "zod";

export const runtime = "nodejs";
const BodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[^\r\n]+$/),
  email: z.string().trim().email().max(320),
  requestId: z.string().uuid(),
});

/** No public download: contact capture must be accepted before attachment delivery. */
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError("Please enter your name and a valid email address.", {
      status: 400,
    });
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) {
    return apiError(
      "Playbook delivery is temporarily unavailable. Please try again later.",
      { status: 503 },
    );
  }
  const { name, email, requestId } = parsed.data;
  try {
    const attachment = await readFile(join(process.cwd(), PLAYBOOK_FILE));
    if (
      attachment.length === 0 ||
      attachment.subarray(0, 5).toString() !== "%PDF-"
    )
      throw new Error("Unavailable attachment");
    const key = createHash("sha256")
      .update(`${requestId}:${email.toLowerCase()}:${name}`)
      .digest("hex");
    const send = async (payload: Record<string, unknown>, step: string) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `playbook-${key}-${step}`,
        },
        body: JSON.stringify({ from, ...payload }),
        signal: AbortSignal.timeout(15000),
      });
      const receipt = await response.json().catch(() => null);
      if (!response.ok || typeof receipt?.id !== "string" || !receipt.id.trim())
        throw new Error("Delivery not accepted");
    };
    await send(
      {
        to: [SITE_OFFER.supportEmail],
        reply_to: email,
        subject: "MyARI playbook contact submission",
        text: `Playbook requested\nName: ${name}\nEmail: ${email}\n\nContact submitted the playbook request form. This is not consent for unrelated marketing.`,
      },
      "capture",
    );
    await send(
      {
        to: [email],
        subject: `Your ${SITE_OFFER.playbook.title}`,
        text: `Hi ${name.split(/\s+/)[0]},\n\nThank you for requesting ${SITE_OFFER.playbook.title}. Your playbook is attached.\n\nThe MyARI Team`,
        attachments: [
          {
            filename: PLAYBOOK_ATTACHMENT_NAME,
            content: attachment.toString("base64"),
          },
        ],
      },
      "delivery",
    );
    return apiOk({ ok: true, delivery: "accepted" });
  } catch {
    // Never log contact details, attachment data, credentials, or provider responses.
    return apiError(
      "We couldn't complete playbook delivery. Please retry your request.",
      { status: 502 },
    );
  }
}
