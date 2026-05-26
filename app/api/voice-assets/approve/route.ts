import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({ voiceAssetId: z.string().uuid() });

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { voiceAssetId } = BodySchema.parse(await request.json());

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .update({ approved: true })
    .eq("id", voiceAssetId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "VOICE_APPROVED",
    entityType: "voice_asset",
    entityId: voiceAssetId,
  });

  return apiOk({ voiceAsset: data });
});
