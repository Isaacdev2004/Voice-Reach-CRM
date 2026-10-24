import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  isElevenLabsConfigured,
  resolveOwnerVoiceId,
  synthesizeSpeech,
  verifyProviderVoiceName,
} from "@/lib/providers/elevenlabs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { previewPersonalization } from "@/lib/voice-studio/verification";
import { z } from "zod";

const BodySchema = z.object({
  script: z.string().min(10).max(5000),
  title: z.string().min(1).max(120),
  scriptId: z.string().min(1).optional(),
  voiceId: z.string().optional(),
  requiredVoiceName: z.literal("Sapphire").optional(),
  voiceProfileId: z.string().uuid().optional(),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  if (!isElevenLabsConfigured()) {
    return apiError(
      "AI audio generation is currently unavailable. You can record or upload audio instead.",
      {
        status: 503,
        code: "elevenlabs_not_configured",
      },
    );
  }

  const body = BodySchema.parse(await request.json());

  const personalization = previewPersonalization(body.script, {});
  if (!personalization.ready)
    return apiError(
      "Replace missing or unsupported variables with the exact words to record before generating prerecorded audio.",
      { status: 400 },
    );
  let voiceId:string,audioBuffer:ArrayBuffer;
  try{voiceId=await resolveOwnerVoiceId(ownerId,{voiceId:body.voiceId,voiceProfileId:body.voiceProfileId});if(body.requiredVoiceName && !await verifyProviderVoiceName(voiceId,body.requiredVoiceName))return apiError("Sapphire is not available or could not be verified for the selected authorized voice. No substitute was generated.",{status:503,code:"preferred_voice_unavailable"});audioBuffer=await synthesizeSpeech({text:body.script,voiceId});}catch{return apiError("Audio could not be generated with the selected voice. Check the voice selection or try again later.",{status:503});}
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const storagePath = `${ownerId}/ai-${crypto.randomUUID()}.mp3`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(bucket)
    .upload(storagePath, Buffer.from(audioBuffer), {
      contentType: "audio/mpeg",
      upsert: false,
    });

  if (uploadError) return apiError("Generated audio could not be stored.", { status: 500 });

  const { data: voiceAsset, error: insertError } = await supabaseAdmin
    .from("voice_assets")
    .insert({
      owner_id: ownerId,
      script_id: body.scriptId ?? `ai-${Date.now()}`,
      title: body.title,
      storage_path: storagePath,
      approved: false,
      studio_metadata: { source: "ai", script: body.script, provider: "elevenlabs", providerVoiceId: voiceId, createdAsDraft: true },
    })
    .select("*")
    .single();

  if (insertError) return apiError("Generated recording could not be saved.", { status: 500 });

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
