import { apiOk, withApiHandler } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { evaluateTriggers } from "@/lib/automations/engine";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

function normalizeVariants(from: string): string[] {
  const d = digits(from);
  const last10 = d.slice(-10);
  const variants = new Set<string>();
  if (d) variants.add(d);
  if (last10) {
    variants.add(last10);
    variants.add(`1${last10}`);
    variants.add(`+1${last10}`);
  }
  if (from.trim()) variants.add(from.trim());
  return [...variants];
}

/**
 * Twilio inbound SMS webhook.
 * Configure in Twilio Console → Phone Number → Messaging →
 * "A message comes in" webhook:
 *   https://voice-reach-crm.vercel.app/api/webhooks/twilio/sms
 *
 * Handles STOP / UNSUBSCRIBE / CANCEL / END / QUIT → DNC
 * and HELP → auto ACK (Twilio often handles HELP/STOP at carrier level too).
 */
export const POST = withApiHandler(async (request) => {
  const contentType = request.headers.get("content-type") ?? "";
  let raw: Record<string, string> = {};
  if (contentType.includes("application/json")) {
    raw = (await request.json().catch(() => ({}))) as Record<string, string>;
  } else {
    const text = await request.text();
    raw = Object.fromEntries(new URLSearchParams(text)) as Record<string, string>;
  }

  const from = String(raw.From ?? raw.from ?? "");
  const body = String(raw.Body ?? raw.body ?? "").trim();
  const messageSid = String(raw.MessageSid ?? raw.SmsSid ?? "");
  const keyword = body.toUpperCase().split(/\s+/)[0] ?? "";

  try {
    await supabaseAdmin.from("provider_webhooks").insert({
      provider: "twilio",
      external_id: messageSid || null,
      event_type: "inbound_sms",
      raw,
      processed: false,
    });
  } catch {
    /* ignore webhook log failures */
  }

  if (!from) {
    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }

  const variants = normalizeVariants(from);
  const last10 = digits(from).slice(-10);

  // Prefer digit suffix match — stored phones may include spaces/dashes/+1
  const { data: pool } = await supabaseAdmin
    .from("contacts")
    .select("id, owner_id, phone, dnc, opt_out_requested")
    .limit(2000);

  const matched = (pool ?? []).filter((c) => {
    const p = digits(c.phone ?? "");
    if (!p) return false;
    if (last10 && p.endsWith(last10)) return true;
    return variants.some((v) => p === digits(v) || p.endsWith(digits(v).slice(-10)));
  });

  const isStop = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(keyword);
  const isHelp = keyword === "HELP" || keyword === "INFO";
  const isStart = ["START", "YES", "UNSTOP"].includes(keyword);

  let twimlMessage = "";

  for (const contact of matched) {
    if (isStop) {
      await supabaseAdmin
        .from("contacts")
        .update({
          dnc: true,
          opt_out_requested: true,
          sequence_active: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      await recordEngagementEvent({
        ownerId: contact.owner_id,
        contactId: contact.id,
        eventType: "opt_out",
        channel: "sms",
        metadata: { from, body, messageSid, keyword },
      }).catch(() => undefined);

      await evaluateTriggers({
        ownerId: contact.owner_id,
        contactId: contact.id,
        event: "opt_out",
        metadata: { from, body },
      }).catch(() => undefined);

      await writeAuditLog({
        ownerId: contact.owner_id,
        action: "SMS_OPT_OUT",
        entityType: "contact",
        entityId: contact.id,
        metadata: { from, body, messageSid },
      }).catch(() => undefined);

      twimlMessage =
        "You are unsubscribed and will no longer receive texts from this number. Reply HELP for help.";
    } else if (isStart) {
      await supabaseAdmin
        .from("contacts")
        .update({
          dnc: false,
          opt_out_requested: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", contact.id);

      await writeAuditLog({
        ownerId: contact.owner_id,
        action: "SMS_OPT_IN",
        entityType: "contact",
        entityId: contact.id,
        metadata: { from, body, messageSid },
      }).catch(() => undefined);

      twimlMessage = "You have been re-subscribed to messages. Reply STOP to opt out.";
    } else if (isHelp) {
      twimlMessage =
        "ARI CRM help: Reply STOP to opt out of texts. For support contact your agent. Msg&data rates may apply.";
    } else {
      await recordEngagementEvent({
        ownerId: contact.owner_id,
        contactId: contact.id,
        eventType: "replied",
        channel: "sms",
        metadata: { from, body, messageSid },
      }).catch(() => undefined);

      await evaluateTriggers({
        ownerId: contact.owner_id,
        contactId: contact.id,
        event: "sms_replied",
        metadata: { from, body },
      }).catch(() => undefined);
    }
  }

  if (!matched.length && isStop) {
    twimlMessage =
      "You are unsubscribed and will no longer receive texts from this number. Reply HELP for help.";
  }

  const xml = twimlMessage
    ? `<Response><Message>${escapeXml(twimlMessage)}</Message></Response>`
    : "<Response></Response>";

  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
});

export const GET = withApiHandler(async () =>
  apiOk({
    message: "Twilio inbound SMS webhook. Configure Messaging 'A message comes in' to this URL.",
  }),
);

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
