import { supabaseAdmin as db } from "@/lib/supabaseAdmin";
import { resolveCredential, digest } from "@/lib/messaging/isv/service";
import {
  validateTwilioSignature,
  twilioWebhookPublicUrl,
} from "@/lib/webhooks/twilio-signature";
export async function POST(request: Request) {
  if (
    process.env.MANAGED_SMS_PILOT_ENABLED !== "true" &&
    process.env.MANAGED_SMS_WEBHOOKS_ENABLED !== "true"
  )
    return new Response(null, { status: 503 });
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16384)
      return new Response(null, { status: 413 });
    const fields = new URLSearchParams(text),
      raw = Object.fromEntries(fields);
    if ([...new Set(fields.keys())].some((k) => fields.getAll(k).length !== 1))
      return new Response(null, { status: 400 });
    if (
      !/^AC[0-9a-f]{32}$/i.test(raw.AccountSid || "") ||
      !/^SM[0-9a-f]{32}$/i.test(raw.MessageSid || "")
    )
      return new Response(null, { status: 400 });
    if (
      ![
        "accepted",
        "queued",
        "sending",
        "sent",
        "delivered",
        "undelivered",
        "failed",
        "canceled",
      ].includes(raw.MessageStatus || "")
    )
      return new Response(null, { status: 400 });
    const a = await db
      .from("isv_sms_assignments")
      .select("owner_id,id")
      .eq("account_sid", raw.AccountSid)
      .eq("active", true)
      .maybeSingle();
    if (a.error || !a.data) return new Response(null, { status: 403 });
    const token = await resolveCredential(a.data.owner_id, raw.AccountSid);
    if (
      !validateTwilioSignature(
        token,
        request.headers.get("x-twilio-signature") || "",
        twilioWebhookPublicUrl(request),
        raw,
      )
    )
      return new Response(null, { status: 403 });
    const result = await db.rpc("isv_record_delivery", {
      p_owner: a.data.owner_id,
      p_assignment: a.data.id,
      p_sid: raw.MessageSid,
      p_status: raw.MessageStatus || "",
      p_hash: digest(
        JSON.stringify(
          Object.keys(raw)
            .sort()
            .map((k) => [k, raw[k]]),
        ),
      ),
    });
    return new Response(null, { status: result.error ? 503 : 204 });
  } catch {
    return new Response(null, { status: 503 });
  }
}
