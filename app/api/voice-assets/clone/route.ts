import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { cloneVoiceFromSample, isElevenLabsConfigured } from "@/lib/providers/elevenlabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  label: z.string().min(2).max(80),
  sampleAssetId: z.string().uuid(),
});

export const POST = withApiHandler(async (request) => {
  if (!isElevenLabsConfigured()) {
    return apiError("ElevenLabs is not configured. Add ELEVENLABS_API_KEY to your environment.", {
      status: 503,
      code: "elevenlabs_not_configured",
    });
  }

  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  const { data: asset, error: assetError } = await supabaseAdmin
    .from("voice_assets")
    .select("id, storage_path, title")
    .eq("id", body.sampleAssetId)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (assetError) return apiError(assetError.message, { status: 500 });
  if (!asset?.storage_path) return apiError("Sample recording not found", { status: 404 });

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from(bucket)
    .download(asset.storage_path);

  if (downloadError || !file) {
    return apiError(downloadError?.message ?? "Could not download sample audio", { status: 500 });
  }

  const sampleBuffer = await file.arrayBuffer();
  const cloned = await cloneVoiceFromSample({
    name: body.label,
    sampleBuffer,
    sampleFileName: `${body.label.replace(/\s+/g, "-")}.mp3`,
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("voice_profiles")
    .insert({
      owner_id: ownerId,
      provider: "elevenlabs",
      provider_voice_id: cloned.voiceId,
      label: body.label,
      sample_asset_id: asset.id,
    })
    .select("*")
    .single();

  if (profileError) return apiError(profileError.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "VOICE_PROFILE_CLONED",
    entityType: "voice_profile",
    entityId: profile.id,
    metadata: { label: body.label, sampleAssetId: asset.id },
  });

  return apiOk(
    {
      voiceProfile: profile,
      message: `Voice clone "${body.label}" is ready for script-to-speech.`,
    },
    { status: 201 },
  );
});
