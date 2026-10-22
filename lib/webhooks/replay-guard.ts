import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Skip duplicate provider events (replay / double POST). */
export async function isDuplicateProviderWebhook(
  provider: string,
  externalId: string | null | undefined,
  eventType?: string,
): Promise<boolean> {
  const id = externalId?.trim();
  if (!id) return false;

  let query = supabaseAdmin
    .from("provider_webhooks")
    .select("id")
    .eq("provider", provider)
    .eq("external_id", id)
    .limit(1);
  if (eventType) query = query.eq("event_type", eventType);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error("Webhook replay protection unavailable.");

  return Boolean(data?.id);
}
