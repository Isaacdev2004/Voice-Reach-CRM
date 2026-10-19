import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Skip duplicate provider events (replay / double POST). */
export async function isDuplicateProviderWebhook(
  provider: string,
  externalId: string | null | undefined,
): Promise<boolean> {
  const id = externalId?.trim();
  if (!id) return false;

  const { data } = await supabaseAdmin
    .from("provider_webhooks")
    .select("id")
    .eq("provider", provider)
    .eq("external_id", id)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}
