import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("voice_profiles")
    .select("id, label, provider_voice_id, sample_asset_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });
  return apiOk({ profiles: data ?? [] });
});
