import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  defaultElevenLabsVoiceId,
  isElevenLabsConfigured,
  synthesizeSpeech,
} from "@/lib/providers/elevenlabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  script: z.string().min(10).max(5000),
  title: z.string().min(1).max(120),
  scriptId: z.string().min(1).optional(),
  voiceId: z.string().optional(),
  voiceProfileId: z.string().uuid().optional(),
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

  let voiceId = body.voiceId ?? defaultElevenLabsVoiceId();
  if (body.voiceProfileId) {
    const { data: profile } = await supabaseAdmin
      .from("voice_profiles")
      .select("provider_voice_id")
      .eq("id", body.voiceProfileId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (profile?.provider_voice_id) voiceId = profile.provider_voice_id;
  }

  const audioBuffer = await synthesizeSpeech({ text: body.script, voiceId });
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const storagePath = `${ownerId}/ai-${crypto.randomUUID()}.mp3`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, Buffer.from(audioBuffer), {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (uploadError) return apiError(uploadError.message, { status: 500 });

  const { data: voiceAsset, error: insertError } = await supabaseAdmin
    .from("voice_assets")
    .insert({
      owner_id: ownerId,
      script_id: body.scriptId ?? `ai-${Date.now()}`,
      title: body.title,
      storage_path: storagePath,
      approved: false,
    })
    .select("*")
    .single();

  if (insertError) return apiError(insertError.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "VOICE_AI_SYNTHESIZED",
    entityType: "voice_asset",
    entityId: voiceAsset.id,
    metadata: { voiceId, title: body.title, chars: body.script.length },
  });

  const { data: signed } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60);

  return apiOk(
    {
      voiceAsset: { ...voiceAsset, playbackUrl: signed?.signedUrl ?? null },
      message: "AI voice generated. Approve it before sending in campaigns.",
    },
    { status: 201 },
  );
});
