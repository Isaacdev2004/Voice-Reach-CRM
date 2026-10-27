import { createHash } from "node:crypto";
import { apiError, apiOk } from "@/lib/api-response";
import {
  OverviewContext,
  overviewReturnPath,
} from "@/lib/marketing/overview-context";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { SITE_URL } from "@/lib/seo/site";
import { z } from "zod";

export const runtime = "nodejs";
function overviewAvailable() {
  return (
    process.env.VERCEL_ENV !== "preview" &&
    process.env.AUTH_OVERVIEW_EMAIL_ENABLED === "true" &&
    Boolean(
      process.env.RESEND_API_KEY?.trim() &&
        process.env.RESEND_FROM_EMAIL?.trim(),
    )
  );
}

/** Product availability only; never returns credentials or accepts a lead. */
export function GET() {
  const response = apiOk({ available: overviewAvailable() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
const Body = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(320)
      .transform((s) => s.toLowerCase()),
    requestId: z.string().uuid(),
    updatesConsent: z.boolean(),
    context: OverviewContext,
    website: z.string().max(200).default(""),
  })
  .strict();

/** Uses the existing public Resend capture/delivery infrastructure; never CRM campaign transport. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return apiError("This request is not authorized.", { status: 403 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 4096)
    return apiError("Request is too large.", { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return apiError("Enter a valid email address.", { status: 400 });
  }
  const parsed = Body.safeParse(value);
  if (!parsed.success || parsed.data.website)
    return apiError("Check your email address and try again.", { status: 400 });
  const key = process.env.RESEND_API_KEY?.trim(),
    from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!overviewAvailable() || !key || !from) {
    return apiError(
      "Overview emails are unavailable right now. You can watch the walkthrough or contact hello@myari.io.",
      { status: 503, code: "overview_unavailable" },
    );
  }
  const { email, updatesConsent, context } = parsed.data;
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        version: "overview-v1",
        email,
        updatesConsent,
        context,
      }),
    )
    .digest("hex");
  let captured = false;
  const send = async (payload: Record<string, unknown>, step: string) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `auth-overview-${fingerprint}-${step}`,
      },
      body: JSON.stringify({ from, ...payload }),
    });
    const receipt = await response.json().catch(() => null);
    if (!response.ok || typeof receipt?.id !== "string" || !receipt.id.trim())
      throw Error("Delivery unconfirmed");
  };
  try {
    // The provider's accepted message retains its timestamp, consent choice/version and attribution.
    // Never insert into a subscriber's contacts or attach this visitor to a marketing campaign.
    await send(
      {
        to: [SITE_OFFER.supportEmail],
        reply_to: email,
        subject: "MyARI overview requested",
        text: [
          "A visitor explicitly requested the MyARI overview.",
          `Email: ${email}`,
          `Optional product updates consent: ${updatesConsent ? "YES" : "NO"}`,
          "Consent text/version: overview-v1 — I’d also like MyARI product updates by email (optional).",
          "The overview request alone is not consent for unrelated marketing. No automated enrollment is authorized.",
          `Plan/referral context: ${JSON.stringify(context)}`,
        ].join("\n"),
      },
      "capture",
    );
    captured = true;
    await send(
      {
        to: [email],
        subject: "A closer look at MyARI",
        text: [
          "Your business. Beautifully connected.",
          "",
          "Thanks for taking a closer look at MyARI. Here’s your overview:",
          "",
          "Keep contacts, notes, tasks and your calendar together in one workspace.",
          "Prepare follow-up campaigns and review drafts before deciding what to launch.",
          "Explore AI assistance where your plan and account access support it. Connected integrations and sending require setup and appropriate permissions.",
          "",
          `Explore MyARI: ${SITE_URL}/features`,
          `Watch the walkthrough: ${SITE_URL}/#demo`,
          `Continue when you’re ready: ${SITE_URL}${overviewReturnPath(context)}`,
          `Request a personal introduction: ${SITE_URL}/contact`,
          "",
          "This request did not create an account, start a trial or enroll you in marketing.",
          updatesConsent
            ? "Your optional interest in product updates was recorded for MyARI to review; no automatic subscription was created."
            : "You did not opt into product updates.",
          `Questions or changes to your preferences? Email ${SITE_OFFER.supportEmail}.`,
          "",
          "The MyARI Team",
        ].join("\n"),
      },
      "delivery",
    );
    return apiOk({ ok: true, capture: "accepted", delivery: "accepted" });
  } catch {
    // No email addresses, credentials, request bodies or provider responses in logs/browser errors.
    return apiError(
      captured
        ? "Your request reached MyARI, but the overview email could not be confirmed. Please retry."
        : "We couldn’t confirm your request. Please retry or watch the walkthrough.",
      {
        status: 502,
        code: captured
          ? "overview_delivery_unconfirmed"
          : "overview_capture_unconfirmed",
      },
    );
  }
}
