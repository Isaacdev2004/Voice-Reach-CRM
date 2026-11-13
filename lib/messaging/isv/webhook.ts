import "server-only";
import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import {
  validateTwilioSignature,
  twilioWebhookPublicUrl,
} from "@/lib/webhooks/twilio-signature";
import { normalizeE164, classifyReply } from "@/lib/communications/inbound";
import { resolveCredential, digest } from "./service";
const xml = () =>
  new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
/** No outbound response messages: STOP/HELP auto-responses must be configured in Twilio Advanced Opt-Out. */
export async function managedSmsWebhook(request: Request) {
  if (
    process.env.MANAGED_SMS_PILOT_ENABLED !== "true" &&
    process.env.MANAGED_SMS_WEBHOOKS_ENABLED !== "true"
  )
    return new Response("Managed webhook disabled", { status: 503 });
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16384)
      return new Response("Payload too large", { status: 413 });
    const fields = new URLSearchParams(text),
      raw = Object.fromEntries(fields);
    if ([...new Set(fields.keys())].some((k) => fields.getAll(k).length !== 1))
      return new Response("Ambiguous payload", { status: 400 });
    const account = raw.AccountSid,
      sid = raw.MessageSid,
      from = normalizeE164(raw.From || ""),
      to = normalizeE164(raw.To || "");
    if (
      !/^AC[0-9a-f]{32}$/i.test(account || "") ||
      !/^SM[0-9a-f]{32}$/i.test(sid || "") ||
      !from ||
      !to ||
      (raw.Body || "").length > 4000
    )
      return new Response("Invalid event", { status: 400 });
    // Untrusted routing hints only select a verification key; no mutation occurs before signature validation.
    const result = await db
      .from("isv_sms_assignments")
      .select("id,owner_id,account_sid,from_number")
      .eq("account_sid", account)
      .eq("from_number", to)
      .eq("active", true)
      .maybeSingle();
    if (result.error)
      return new Response("Routing unavailable", { status: 503 });
    const a = result.data;
    if (!a) return new Response("Unknown sender", { status: 403 });
    const token = await resolveCredential(a.owner_id, account);
    if (
      !validateTwilioSignature(
        token,
        request.headers.get("x-twilio-signature") || "",
        twilioWebhookPublicUrl(request),
        raw,
      )
    )
      return new Response("Invalid signature", { status: 403 });
    const keyword = (raw.OptOutType || "").toUpperCase(),
      body = (raw.Body || "").trim();
    const kind =
      keyword === "STOP" || classifyReply(body) === "Opt-out"
        ? "stop"
        : keyword === "HELP" || /^HELP$/i.test(body)
          ? "help"
          : "reply";
    // The receipt RPC resolves a unique normalized contact within this owner, atomically.
    const hash = digest(
      JSON.stringify(
        Object.keys(raw)
          .sort()
          .map((k) => [k, raw[k]]),
      ),
    );
    const saved = await db.rpc("isv_receive_sms", {
      p_owner: a.owner_id,
      p_assignment: a.id,
      p_sid: sid,
      p_hash: hash,
      p_phone: from,
      p_body: raw.Body || "",
      p_kind: kind,
      p_contact: null,
    });
    if (saved.error)
      return new Response("Event could not be committed; retry", {
        status: 503,
      });
    return xml();
  } catch {
    return new Response("Webhook processing unavailable; retry", {
      status: 503,
    });
  }
}
