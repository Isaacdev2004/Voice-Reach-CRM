import { recordEngagementEvent } from "@/lib/engagement/record";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  validateTwilioSignature,
  twilioWebhookPublicUrl,
} from "@/lib/webhooks/twilio-signature";
import { verifyVoiceWebhookRequest } from "@/lib/webhooks/voice-webhook-auth";
import { evidenceEnabled, insertDeliveryEvent, safeErrorCode } from "./store";
import type { DeliveryEventType, DeliveryMessage } from "./types";
export type NormalizedDisposition = {
  reference: string;
  type: DeliveryEventType;
  occurredAt: string | null;
  eventKey: string;
  errorCode: string | null;
};
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : null;
export function normalizeDisposition(
  provider: string,
  raw: Record<string, unknown>,
  eventId?: string,
): NormalizedDisposition | null {
  let reference = "",
    type: DeliveryEventType | undefined,
    occurredAt: string | null = null,
    errorCode: string | null = null;
  if (provider === "twilio") {
    reference = typeof raw.MessageSid === "string" ? raw.MessageSid : "";
    const statuses: Record<string, DeliveryEventType> = {
      queued: "queued",
      accepted: "accepted",
      sending: "submitted",
      sent: "sent",
      delivered: "delivered",
      failed: "failed",
      undelivered: "undelivered",
    };
    type =
      statuses[String(raw.MessageStatus ?? raw.SmsStatus ?? "").toLowerCase()];
    // Twilio status callbacks have no guaranteed event timestamp. Keep it unknown.
    errorCode = safeErrorCode(raw.ErrorCode);
  } else if (provider === "resend") {
    const data =
      raw.data && typeof raw.data === "object"
        ? (raw.data as Record<string, unknown>)
        : {};
    reference = typeof data.email_id === "string" ? data.email_id : "";
    const types: Record<string, DeliveryEventType> = {
      "email.sent": "sent",
      "email.delivered": "delivered",
      "email.delivery_delayed": "queued",
      "email.bounced": "bounced",
      "email.failed": "failed",
      "email.opened": "opened",
      "email.clicked": "clicked",
      "email.complained": "opt_out",
    };
    type = types[String(raw.type ?? "")];
    occurredAt = date(raw.created_at);
  } else if (provider === "slybroadcast") {
    reference =
      typeof raw.sessionid === "string"
        ? raw.sessionid
        : typeof raw.id === "string"
          ? raw.id
          : "";
    // Do not infer delivery from ambiguous numeric dispositions or generic 'completed'.
    const statuses: Record<string, DeliveryEventType> = {
      queued: "queued",
      submitted: "submitted",
      accepted: "accepted",
      delivered: "delivered",
      listened: "listened",
      callback: "callback",
      failed: "failed",
      rejected: "rejected",
    };
    type = statuses[String(raw.status ?? "").toLowerCase()];
  }
  if (!reference || !type) return null;
  return {
    reference,
    type,
    occurredAt,
    errorCode,
    eventKey: eventId
      ? `${provider}:${eventId}:${type}`
      : `${provider}:${reference}:${type}`,
  };
}
export function verifyResendSignature(
  body: string,
  headers: Headers,
  now = Date.now(),
) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.replace(/^whsec_/, "");
  const id = headers.get("svix-id"),
    timestamp = headers.get("svix-timestamp"),
    signatures = headers.get("svix-signature");
  if (
    !secret ||
    !id ||
    !timestamp ||
    !signatures ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300
  )
    return false;
  const expected = crypto
    .createHmac("sha256", Buffer.from(secret, "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest();
  return signatures.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const actual = Buffer.from(value, "base64");
    return (
      actual.length === expected.length &&
      crypto.timingSafeEqual(actual, expected)
    );
  });
}
export async function processDeliveryWebhook(
  request: Request,
  provider: string,
): Promise<{ status: number; result: string }> {
  if (!["twilio", "resend", "slybroadcast"].includes(provider))
    return { status: 404, result: "Unsupported provider" };
  const body = await request.text();
  if (body.length > 262144) return { status: 413, result: "Payload too large" };
  let raw: Record<string, unknown>;
  try {
    raw = request.headers.get("content-type")?.includes("json")
      ? JSON.parse(body)
      : Object.fromEntries(new URLSearchParams(body));
    if (!raw || Array.isArray(raw) || typeof raw !== "object") throw Error();
  } catch {
    return { status: 400, result: "Invalid event" };
  }
  const authenticated =
    provider === "twilio"
      ? !!process.env.TWILIO_AUTH_TOKEN &&
        validateTwilioSignature(
          process.env.TWILIO_AUTH_TOKEN,
          request.headers.get("x-twilio-signature") ?? "",
          twilioWebhookPublicUrl(request),
          raw as Record<string, string>,
        )
      : provider === "resend"
        ? verifyResendSignature(body, request.headers)
        : !!process.env.VOICE_WEBHOOK_SECRET &&
          verifyVoiceWebhookRequest(request);
  if (!authenticated)
    return { status: 401, result: "Invalid webhook authentication" };
  if (!evidenceEnabled())
    return { status: 503, result: "Delivery evidence is not enabled" };
  const event = normalizeDisposition(
    provider,
    raw,
    provider === "resend"
      ? (request.headers.get("svix-id") ?? undefined)
      : undefined,
  );
  if (!event)
    return { status: 200, result: "Unsupported or uncorrelated event ignored" };
  // Webhooks have no subscriber session: resolve an exact stored provider message ID, never caller-supplied owner/campaign tags.
  const lookup = await supabaseAdmin
    .from("outbound_messages")
    .select(
      "id, owner_id, contact_id, campaign_id, step_id, channel, provider, provider_message_id",
    )
    .eq("provider", provider)
    .eq("provider_message_id", event.reference)
    .limit(2);
  if (lookup.error)
    return { status: 503, result: "Delivery evidence unavailable" };
  if (lookup.data?.length !== 1)
    return { status: 503, result: "Message correlation pending; retry event" };
  const message = lookup.data[0] as DeliveryMessage;
  try {
    const inserted = await insertDeliveryEvent({
      owner_id: message.owner_id,
      message_id: message.id,
      provider,
      event_key: event.eventKey,
      event_type: event.type,
      occurred_at: event.occurredAt,
      source: "webhook",
      error_code: event.errorCode,
    });
    if (event.type === "opt_out" && message.contact_id) {
      const suppression = await supabaseAdmin
        .from("contacts")
        .update({ dnc: true, opt_out_requested: true })
        .eq("id", message.contact_id)
        .eq("owner_id", message.owner_id);
      if (suppression.error)
        return {
          status: 503,
          result: "Suppression update unavailable; retry event",
        };
    }
    if (
      inserted &&
      [
        "delivered",
        "failed",
        "opened",
        "clicked",
        "replied",
        "opt_out",
        "listened",
        "callback",
      ].includes(event.type)
    ) {
      await recordEngagementEvent({
        ownerId: message.owner_id,
        contactId: message.contact_id,
        campaignId: message.campaign_id?.startsWith("automation")
          ? null
          : message.campaign_id,
        stepId: message.step_id,
        eventType: event.type as Parameters<
          typeof recordEngagementEvent
        >[0]["eventType"],
        channel: message.channel,
        metadata: { provider, evidence: "verified", messageId: message.id },
      });
    }
    return {
      status: 200,
      result: inserted ? "Event recorded" : "Duplicate event ignored",
    };
  } catch {
    return { status: 503, result: "Event recording unavailable; retry event" };
  }
}
