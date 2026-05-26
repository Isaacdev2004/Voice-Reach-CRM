import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });

  const assets = await Promise.all(
    (data ?? []).map(async (asset) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      return { ...asset, playbackUrl: signed?.signedUrl ?? null };
    }),
  );

  return apiOk({ voiceAssets: assets });
});
