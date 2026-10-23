import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  hasAudioSignature,
  MAX_AUDIO_BYTES,
} from "@/lib/voice-studio/verification";
import { z } from "zod";

const BodySchema = z.object({
  voiceAssetId: z.string().uuid(),
  confirmed: z.literal(true),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { voiceAssetId } = BodySchema.parse(await request.json());

  const existing = await supabaseAdmin
    .from("voice_assets")
    .select("*")
    .eq("id", voiceAssetId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (existing.error)
    return apiError("Could not verify recording.", { status: 503 });
  if (!existing.data) return apiError("Recording not found.", { status: 404 });
  const asset = existing.data;
  if (!asset.storage_path?.startsWith(`${ownerId}/`))
    return apiError("Recording storage could not be verified.", {
      status: 400,
    });
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const file = await supabaseAdmin.storage
    .from(bucket)
    .download(asset.storage_path);
  if (file.error || !file.data?.size)
    return apiError("Upload a complete recording before approving.", {
      status: 409,
    });
  if (
    file.data.size > MAX_AUDIO_BYTES ||
    !hasAudioSignature(
      new Uint8Array(await file.data.arrayBuffer()),
      asset.storage_path,
    )
  )
    return apiError(
      "The recording format could not be verified. Upload a valid audio file.",
      { status: 400 },
    );
  if (asset.approved) return apiOk({ voiceAsset: asset });
  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .update({
      approved: true,
      studio_metadata: {
        ...asset.studio_metadata,
        approvedAt: new Date().toISOString(),
        approvedBy: ownerId,
      },
    })
    .eq("id", voiceAssetId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error)
    return apiError(
      "Could not approve recording. Check that the Voice Studio migration is installed.",
      { status: 500 },
    );

  await writeAuditLog({
    ownerId,
    action: "VOICE_APPROVED",
    entityType: "voice_asset",
    entityId: voiceAssetId,
  });

  return apiOk({ voiceAsset: data });
});
