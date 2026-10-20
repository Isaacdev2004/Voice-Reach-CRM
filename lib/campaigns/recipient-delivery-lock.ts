import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const TERMINAL_DELIVERY_STATUSES = new Set([
  "sent",
  "mock_sent",
  "queued",
  "delivered",
]);

/** Returns true when this recipient was locked for an outbound attempt. */
export async function claimRecipientForOutboundSend(
  recipientId: string,
  ownerId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("campaign_recipients")
    .update({ delivery_status: "queued", updated_at: new Date().toISOString() })
    .eq("id", recipientId)
    .eq("owner_id", ownerId)
    .in("delivery_status", ["not_sent", "failed"])
    .select("id")
    .maybeSingle();

  return !error && Boolean(data?.id);
}
