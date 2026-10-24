import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { messageRecord, buildProviderHealth } from "./metrics";
import type {
  DeliveryMessage,
  DeliveryEvent,
  SyncRun,
  DeliveryChannel,
  DeliveryEventType,
} from "./types";
import type { SendRequest, SendResult } from "@/lib/providers/types";
export const evidenceEnabled = () =>
  process.env.DELIVERY_EVIDENCE_ENABLED === "true";
export function providerConfiguration(): Record<DeliveryChannel, boolean> {
  return {
    sms: !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
    ),
    email: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    voicemail: !!(
      process.env.SLYBROADCAST_USERNAME &&
      process.env.SLYBROADCAST_PASSWORD &&
      process.env.SLYBROADCAST_CALLER_ID
    ),
  };
}
export async function beginMessage(
  request: SendRequest,
  provider: string,
): Promise<string> {
  if (
    !request.ownerId ||
    !request.contactId ||
    !["sms", "email", "voicemail"].includes(request.channel)
  )
    throw new Error("Delivery evidence requires an authorized contact.");
  const { data, error } = await supabaseAdmin
    .from("outbound_messages")
    .insert({
      owner_id: request.ownerId,
      logical_key: request.idempotencyKey ?? crypto.randomUUID(),
      provider,
      channel: request.channel,
      campaign_id: request.campaignId,
      contact_id: request.contactId,
      recipient_id: request.recipientId,
      step_id: request.stepId ?? null,
      subject:
        request.channel === "voicemail" ? null : (request.subject ?? null),
      body: request.channel === "voicemail" ? null : (request.body ?? null),
      submission_status: "pending",
    })
    .select("id")
    .single();
  if (error || !data)
    throw new Error(
      "Delivery evidence is unavailable. No message was submitted.",
    );
  if (request.approvedMessage) {
    try {
      await insertDeliveryEvent({
        owner_id: request.ownerId!,
        message_id: data.id,
        provider,
        event_key: `attempt:${data.id}`,
        event_type: "submitted",
        occurred_at: null,
        source: "submission",
        error_code: null,
      });
    } catch {
      await supabaseAdmin
        .from("outbound_messages")
        .update({ submission_status: "failed", error_code: "preflight" })
        .eq("id", data.id)
        .eq("owner_id", request.ownerId!);
      throw new Error(
        "Delivery audit is unavailable. No provider request was made.",
      );
    }
  }
  return data.id;
}
export async function insertDeliveryEvent(
  event: Omit<DeliveryEvent, "id" | "received_at">,
) {
  const { error } = await supabaseAdmin
    .from("outbound_delivery_events")
    .insert(event);
  if (error && error.code !== "23505")
    throw new Error("Delivery event recording unavailable.");
  return !error;
}
export function safeErrorCode(value: unknown): string | null {
  return typeof value === "number" ||
    (typeof value === "string" && /^\d{3,6}$/.test(value))
    ? String(value)
    : null;
}
export async function finishMessage(
  id: string,
  request: SendRequest,
  provider: string,
  result: SendResult,
) {
  const raw =
    result.rawResponse && typeof result.rawResponse === "object"
      ? (result.rawResponse as Record<string, unknown>)
      : {};
  const reference =
    typeof result.providerMessageId === "string" &&
    result.providerMessageId.trim()
      ? result.providerMessageId.trim()
      : null;
  const status =
    result.status === "blocked" && !result.uncertain
      ? "failed"
      : result.uncertain
        ? "unknown"
        : !result.ok
          ? Object.keys(raw).length
            ? "failed"
            : "unknown"
          : !reference
            ? "unknown"
            : "accepted";
  const errorCode =
    safeErrorCode(raw.code) ??
    (!result.ok && status === "unknown"
      ? "ambiguous"
      : !reference
        ? "no_reference"
        : null);
  const { error } = await supabaseAdmin
    .from("outbound_messages")
    .update({
      provider_message_id: reference,
      submission_status: status,
      error_code: errorCode,
    })
    .eq("id", id)
    .eq("owner_id", request.ownerId!);
  if (error)
    throw new Error(
      "Submission may have occurred; reconcile before any retry.",
    );
  let eventType: DeliveryEventType =
    status === "failed"
      ? "failed"
      : status === "unknown"
        ? "submitted"
        : provider === "resend"
          ? "accepted"
          : provider === "slybroadcast"
            ? "submitted"
            : ["queued", "accepted", "sent"].includes(String(raw.status))
              ? (raw.status as DeliveryEventType)
              : "accepted";
  if (!result.ok && status === "unknown") eventType = "submitted";
  await insertDeliveryEvent({
    owner_id: request.ownerId!,
    message_id: id,
    provider,
    event_key: `submission:${id}`,
    event_type: eventType,
    occurred_at: null,
    source: "submission",
    error_code: errorCode,
  });
}
export async function readDelivery(ownerId: string) {
  if (!evidenceEnabled())
    throw new Error(
      "Delivery evidence is awaiting configuration. Historical delivery is not verified.",
    );
  const [messages, events, syncs, contacts, campaigns, steps] =
    await Promise.all([
      ownedRows<DeliveryMessage>("outbound_messages", "*", ownerId),
      ownedRows<DeliveryEvent>("outbound_delivery_events", "*", ownerId),
      ownedRows<SyncRun>("provider_sync_runs", "*", ownerId),
      ownedRows<{ id: string; first_name: string; last_name: string | null }>(
        "contacts",
        "id, first_name, last_name",
        ownerId,
      ),
      ownedRows<{ id: string; name: string }>("campaigns", "id, name", ownerId),
      ownedRows<{ id: string; title: string }>(
        "campaign_steps",
        "id, title",
        ownerId,
      ),
    ]);
  const byContact = new Map(
    contacts.map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" "),
    ]),
  );
  const byCampaign = new Map(campaigns.map((c) => [c.id, c.name]));
  const byStep = new Map(steps.map((s) => [s.id, s.title]));
  const records = messages
    .filter((m) => m.owner_id === ownerId)
    .map((m) =>
      messageRecord(
        m,
        events,
        {
          contact: byContact.get(m.contact_id ?? ""),
          campaign: byCampaign.get(m.campaign_id ?? ""),
          step: byStep.get(m.step_id ?? ""),
        },
        syncs,
      ),
    );
  const health = buildProviderHealth(
    records,
    syncs.filter((s) => s.owner_id === ownerId),
    providerConfiguration(),
  );
  const delayed = new Set(
    health.filter((h) => h.status === "Sync Delayed").map((h) => h.channel),
  );
  return {
    records: records.map((r) =>
      delayed.has(r.channel) && !r.failure && r.status !== "delivered"
        ? { ...r, indicator: "Provider Sync Delayed" }
        : r,
    ),
    health,
    coverage:
      "Evidence collected after delivery tracking is enabled. Earlier records are unverified; no historical data was backfilled. Missing earlier status events are not synthesized.",
    syncs,
  };
}
