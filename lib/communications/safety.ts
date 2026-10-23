import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeE164 } from "./inbound";
export const ROUTING_OWNER = "system:twilio-unattributed";
export function routingId(key: string) {
  const h = createHash("sha256").update(`myari-twilio:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export function sharedReceiver(to: string) {
  const configured = normalizeE164(process.env.TWILIO_FROM_NUMBER ?? "");
  return !!configured && configured === normalizeE164(to);
}
async function privateInsert(
  owner: string,
  id: string,
  action: string,
  metadata: Record<string, unknown>,
  contactId?: string | null,
) {
  const r = await supabaseAdmin.from("audit_logs").insert({
    id,
    owner_id: owner,
    action,
    entity_type:
      action === "TWILIO_CALL_EVENT" ? "contact" : "twilio_routing_private",
    entity_id: contactId ?? null,
    metadata,
  });
  if (r.error && r.error.code !== "23505")
    throw Error("Routing storage unavailable");
}
/** Unattributed provider events are never inserted under an arbitrarily selected subscriber. */
export async function quarantineInbound(
  raw: Record<string, string>,
  kind: "sms" | "call",
  reason: string,
) {
  const from = normalizeE164(raw.From ?? ""),
    to = normalizeE164(raw.To ?? "");
  const sid = raw.MessageSid || raw.CallSid;
  const status = kind === "call" ? (raw.CallStatus ?? "unknown") : "received";
  if (kind === "sms" && from && to) {
    // Transport-scoped hold, not a change to any subscriber contact/campaign. Never auto-cleared by START.
    await privateInsert(
      ROUTING_OWNER,
      routingId(`hold:${to}:${from}`),
      "TWILIO_SHARED_REPLY_HOLD",
      {
        from: to,
        to: from,
        reason:
          "Ambiguous shared-number reply; authorized routing review required.",
      },
    );
  }
  await privateInsert(
    ROUTING_OWNER,
    routingId(`quarantine:${raw.AccountSid}:${kind}:${sid}:${status}`),
    "TWILIO_UNATTRIBUTED",
    {
      sid,
      accountSid: raw.AccountSid,
      kind,
      from,
      to,
      body: kind === "sms" ? String(raw.Body ?? "").slice(0, 10000) : "",
      status,
      parentSid: raw.ParentCallSid ?? null,
      receivedAt: new Date().toISOString(),
      reason,
    },
  );
}
export async function sharedReplyHeld(from: string, to: string) {
  const a = normalizeE164(from),
    b = normalizeE164(to);
  if (!a || !b) throw Error("Invalid number");
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("id")
    .eq("owner_id", ROUTING_OWNER)
    .eq("id", routingId(`hold:${a}:${b}`))
    .eq("action", "TWILIO_SHARED_REPLY_HOLD")
    .maybeSingle();
  if (r.error) throw Error("Routing safety unavailable");
  return !!r.data;
}
export type CallEvent = {
  sid: string;
  parentSid: string | null;
  status: string;
  direction: string;
  from: string;
  to: string;
  accountSid: string;
  duration: number | null;
  answeredBy: string | null;
  occurredAt: string | null;
  receivedAt: string;
};
export async function saveCallEvent(
  owner: string,
  contactId: string | null,
  raw: Record<string, string>,
) {
  const seconds = Number(raw.CallDuration ?? raw.DialCallDuration);
  const metadata: CallEvent = {
    sid: raw.CallSid,
    parentSid: raw.ParentCallSid ?? null,
    status: raw.CallStatus || "unknown",
    direction: raw.Direction || "unknown",
    from: normalizeE164(raw.From) ?? "",
    to: normalizeE164(raw.To) ?? "",
    accountSid: raw.AccountSid,
    duration:
      Number.isFinite(seconds) && seconds >= 0 && Number.isInteger(seconds)
        ? seconds
        : null,
    answeredBy: raw.AnsweredBy || null,
    occurredAt:
      raw.Timestamp && Number.isFinite(Date.parse(raw.Timestamp))
        ? new Date(raw.Timestamp).toISOString()
        : null,
    receivedAt: new Date().toISOString(),
  };
  await privateInsert(
    owner,
    routingId(`call:${raw.AccountSid}:${raw.CallSid}:${metadata.status}`),
    "TWILIO_CALL_EVENT",
    metadata,
    contactId,
  );
}
/** Completed describes a leg ending, not proof that a person answered. */
export function summarizeCall(events: CallEvent[]) {
  const connected = events.some((e) => e.status === "in-progress");
  const humanAnswered = events.some((e) => e.answeredBy === "human");
  const children = events.filter((e) => e.parentSid);
  const forwardedConnected = children.some((e) => e.status === "in-progress");
  const forwardingMissed =
    children.length > 0 &&
    !forwardedConnected &&
    children.some((e) => ["no-answer", "busy"].includes(e.status));
  const missed =
    forwardingMissed ||
    (!connected &&
      events.some((e) => ["no-answer", "busy"].includes(e.status)));
  return {
    connected,
    humanAnswered,
    forwardedConnected,
    forwardingMissed,
    missed,
    duration: events.reduce<number | null>(
      (n, e) => (e.duration === null ? n : Math.max(n ?? 0, e.duration)),
      null,
    ),
    label: humanAnswered
      ? "Human answer reported by Twilio"
      : forwardedConnected
        ? "Forwarded leg connected; human answer unverified"
        : forwardingMissed
          ? "Forwarded leg was not answered"
          : connected
            ? "Call leg connected; human answer unverified"
            : missed
              ? "Missed call reported by Twilio"
              : "Call outcome unverified",
  };
}
