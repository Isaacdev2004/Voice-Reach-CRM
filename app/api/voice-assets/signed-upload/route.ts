import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  scriptId: z.string().min(1),
  title: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().optional().default("audio/webm"),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const safeFileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ownerId}/${crypto.randomUUID()}-${safeFileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (error) return apiError(error.message, { status: 500 });

  const { data: voiceAsset, error: insertError } = await supabaseAdmin
    .from("voice_assets")
    .insert({
      owner_id: ownerId,
      script_id: body.scriptId,
      title: body.title,
      storage_path: storagePath,
      approved: false,
    })
    .select("*")
    .single();

  if (insertError) return apiError(insertError.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "VOICE_SIGNED_UPLOAD_CREATED",
    entityType: "voice_asset",
    entityId: voiceAsset.id,
    metadata: { storagePath },
  });

  return apiOk({
    voiceAsset,
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  });
});
