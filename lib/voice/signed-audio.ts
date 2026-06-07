import { supabaseAdmin } from "@/lib/supabaseAdmin";

type VoiceAssetRow = {
  approved?: boolean;
  storage_path?: string | null;
};

export async function signVoiceAssetUrl(
  asset: VoiceAssetRow | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!asset?.storage_path) return null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(asset.storage_path, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function voiceAssetReady(asset: VoiceAssetRow | null | undefined): boolean {
  return Boolean(asset?.approved && asset.storage_path);
}
