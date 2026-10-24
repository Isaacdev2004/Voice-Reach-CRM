import { loadSavedSettings } from "@/lib/billing/settings-store";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  configuredEnvVoice,
  isElevenLabsConfigured,
  verifyElevenLabsVoice,
} from "@/lib/providers/elevenlabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const preferred=(await loadSavedSettings(ownerId))?.brandKit?.preferredAiVoiceProfileId;
  const { data, error } = await supabaseAdmin
    .from("voice_profiles")
    .select("id, label, provider_voice_id, sample_asset_id, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message.includes("voice_profiles")) {
      const envVoice = configuredEnvVoice();
      return apiOk({
        profiles: [],
        envVoice: preferred ? null : envVoice,
        configured: isElevenLabsConfigured(),
        defaultProfileId: null,
        defaultVoiceId: preferred ? null : envVoice?.voiceId ?? null,
        preferredUnavailable: Boolean(preferred),
        warning: "Run supabase/schema-calendar.sql to enable saved voice profiles.",
      });
    }
    return apiError(error.message, { status: 500 });
  }

  const profiles = data ?? [];
  const envVoice = configuredEnvVoice();
  const defaultProfileId = preferred ? profiles.find(p=>p.id===preferred)?.id ?? null : profiles[0]?.id ?? null;

  return apiOk({
    profiles,
    envVoice,
    configured: isElevenLabsConfigured(),
    defaultProfileId,
    defaultVoiceId: preferred ? profiles.find(p=>p.id===preferred)?.provider_voice_id ?? null : profiles[0]?.provider_voice_id ?? envVoice?.voiceId ?? null,
    preferredUnavailable: Boolean(preferred&&!defaultProfileId),
  });
});

const LinkVoiceSchema = z.object({
  label: z.string().min(2).max(80),
  providerVoiceId: z.string().min(8).max(80),
  consent:z.literal(true),
  sampleAssetId: z.string().uuid().optional().nullable(),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  if (!isElevenLabsConfigured()) {
    return apiError("Voice linking is currently unavailable. Ask your workspace administrator to check the provider connection.", {
      status: 503,
      code: "elevenlabs_not_configured",
    });
  }

  const body = LinkVoiceSchema.parse(await request.json());
  const voiceId = body.providerVoiceId.trim();

  const valid = await verifyElevenLabsVoice(voiceId);
  if (!valid) {
    return apiError(
      "Could not find that voice ID in your ElevenLabs account. Copy it from ElevenCreative → Voices → your voice → Voice ID.",
      { status: 400, code: "invalid_voice_id" },
    );
  }

  const {data:profile,error}=await supabaseAdmin.rpc("claim_subscriber_voice",{p_owner:ownerId,p_voice:voiceId,p_label:body.label.trim(),p_sample:body.sampleAssetId??null});
  if(error)return apiError("This voice could not be linked to your account. Check authorization and the Voice Studio database update.",{status:409});

  await writeAuditLog({
    ownerId,
    action: "VOICE_PROFILE_LINKED",
    entityType: "voice_profile",
    entityId: profile.id,
    metadata: { label: body.label, providerVoiceId: voiceId },
  });

  return apiOk(
    {
      voiceProfile: profile,
      message: `"${body.label}" is linked. Choose it under Speak as, then click Generate audio.`,
    },
    { status: 201 },
  );
});
