import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { messageRecord } from "@/lib/delivery/metrics";
import type { DeliveryMessage, DeliveryEvent } from "@/lib/delivery/types";
import type { Proposal } from "./schema";
export type MessageStatus = {
  state: string;
  message: string;
  providerReference?: string;
  href: string;
};
const unknown = (): MessageStatus => ({
  state: "unknown",
  message:
    "Submission or delivery evidence is unavailable. Reconcile before sending again.",
  href: "/dashboard/activity",
});
export async function messageStatuses(
  owner: string,
  proposals: Proposal[],
): Promise<Map<string, MessageStatus>> {
  const selected = proposals
      .filter((p) => ["sms", "email"].includes(p.action.kind))
      .slice(0, 100),
    result = new Map<string, MessageStatus>();
  if (!selected.length) return result;
  for (const p of selected) result.set(p.id, unknown());
  const r = await supabaseAdmin
    .from("outbound_messages")
    .select("*")
    .eq("owner_id", owner)
    .in(
      "logical_key",
      selected.map((p) => `assistant-${p.rootId ?? p.id}`),
    )
    .limit(101);
  if (r.error || !r.data?.length || r.data.length > 100) return result;
  const rows = r.data as DeliveryMessage[];
  const e = await supabaseAdmin
    .from("outbound_delivery_events")
    .select("*")
    .eq("owner_id", owner)
    .in(
      "message_id",
      rows.map((m) => m.id),
    )
    .order("received_at", { ascending: false })
    .limit(2001);
  if (e.error || e.data.length > 2000) return result;
  for (const p of selected) {
    const row = rows.find(
      (m) => m.logical_key === `assistant-${p.rootId ?? p.id}`,
    );
    if (!row) continue;
    const record = messageRecord(row, e.data as DeliveryEvent[]);
    const failed = ["failed", "undelivered", "bounced", "rejected"].includes(
      record.status,
    );
    const state =
      record.status === "delivered"
        ? "delivered"
        : failed
          ? "failed"
          : ["unknown", "pending"].includes(record.status)
            ? "unknown"
            : "submitted";
    result.set(p.id, {
      state,
      providerReference: row.provider_message_id ?? undefined,
      href: "/dashboard/activity",
      message:
        state === "delivered"
          ? "Delivery confirmed by authenticated provider evidence."
          : state === "failed"
            ? `Delivery failed (${record.status}). Review consent and provider evidence before any new send.`
            : state === "submitted"
              ? "Provider submission recorded. Delivery is not yet confirmed."
              : unknown().message,
    });
  }
  return result;
}
