import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { insertDeliveryEvent, readDelivery } from "./store";
import { normalizeDisposition } from "./webhook";
import { PROVIDERS } from "./metrics";
import type { DeliveryChannel } from "./types";
/** Explicit, bounded status reads only. Never submits, retries, or rewrites a message. */
export async function reconcileChannel(
  owner: string,
  channel: DeliveryChannel,
) {
  if (process.env.ALLOW_DELIVERY_RECONCILIATION !== "true")
    throw new Error(
      "Reconciliation requires release approval and configuration.",
    );
  const provider = PROVIDERS[channel];
  if (channel === "voicemail")
    throw new Error(
      "A verified Slybroadcast reconciliation API is not configured. Webhook evidence only.",
    );
  const snapshot = await readDelivery(owner);
  const pending = snapshot.records
    .filter(
      (r) =>
        r.channel === channel &&
        r.provider === provider &&
        r.provider_message_id &&
        !["delivered", "failed", "undelivered", "bounced", "rejected"].includes(
          r.status,
        ),
    )
    .sort((a, b) =>
      (a.lastSyncAt ?? a.created_at).localeCompare(
        b.lastSyncAt ?? b.created_at,
      ),
    )
    .slice(0, 5);
  const attemptedAt = new Date().toISOString();
  let checked = 0,
    errorCode: string | null = null;
  for (const message of pending) {
    const reference = message.provider_message_id!;
    if (!/^[\w-]{10,100}$/.test(reference)) {
      errorCode = "no_reference";
      continue;
    }
    try {
      let response: Response;
      if (channel === "sms") {
        const sid = process.env.TWILIO_ACCOUNT_SID,
          token = process.env.TWILIO_AUTH_TOKEN;
        if (!sid || !token) throw Error();
        response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages/${encodeURIComponent(reference)}.json`,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            },
            signal: AbortSignal.timeout(10000),
            cache: "no-store",
          },
        );
      } else {
        if (!process.env.RESEND_API_KEY) throw Error();
        response = await fetch(
          `https://api.resend.com/emails/${encodeURIComponent(reference)}`,
          {
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
            signal: AbortSignal.timeout(10000),
            cache: "no-store",
          },
        );
      }
      if (response.status === 429) {
        errorCode = "delayed";
        break;
      }
      if (!response.ok) throw Error();
      const raw = await response.json();
      const disposition =
        channel === "sms"
          ? normalizeDisposition(provider, {
              MessageSid: reference,
              MessageStatus: raw.status,
              ErrorCode: raw.error_code,
            })
          : normalizeDisposition(provider, {
              type: `email.${raw.last_event}`,
              data: { email_id: reference },
            });
      if (!disposition) {
        errorCode = "unavailable";
        continue;
      }
      await insertDeliveryEvent({
        owner_id: owner,
        message_id: message.id,
        provider,
        event_key: `reconcile:${reference}:${attemptedAt}:${disposition.type}`,
        event_type: disposition.type,
        occurred_at: null,
        source: "reconciliation",
        error_code: disposition.errorCode,
      });
      checked++;
      // Sequential bounded reads; at most one request per second. Do not retry 429s.
      if (checked < pending.length)
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      errorCode = "unavailable";
      break;
    }
  }
  // An empty queue is not proof of a working provider connection.
  const succeededAt =
    pending.length > 0 && !errorCode ? new Date().toISOString() : null;
  const logged = await supabaseAdmin.from("provider_sync_runs").insert({
    owner_id: owner,
    channel,
    provider,
    attempted_at: attemptedAt,
    succeeded_at: succeededAt,
    error_code: errorCode,
  });
  if (logged.error)
    throw new Error("Reconciliation evidence could not be saved.");
  return {
    checked,
    attemptedAt,
    succeededAt,
    errorCode,
    pendingRemaining: Math.max(
      0,
      snapshot.health.find((h) => h.channel === channel)!.pendingUpdates -
        checked,
    ),
  };
}
