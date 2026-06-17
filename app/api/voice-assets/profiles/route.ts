import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { configuredEnvVoice } from "@/lib/providers/elevenlabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("voice_profiles")
    .select("id, label, provider_voice_id, sample_asset_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });

  const profiles = data ?? [];
  const envVoice = configuredEnvVoice();
  const defaultProfileId = profiles[0]?.id ?? null;

  return apiOk({
    profiles,
    envVoice,
    defaultProfileId,
    defaultVoiceId: profiles[0]?.provider_voice_id ?? envVoice?.voiceId ?? null,
  });
});
