import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

import { audioExtension, validateAudio } from "@/lib/voice-studio/verification";

const BodySchema = z.object({
  scriptId: z.string().min(1),
  title: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string(),
  size: z.number().int().positive(),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());
  const invalid = validateAudio(body.contentType, body.size);
  if (invalid) return apiError(invalid, { status: 400 });
  if (
    !body.fileName
      .toLowerCase()
      .endsWith(`.${audioExtension(body.contentType)}`)
  )
    return apiError("File format does not match its extension.", {
      status: 400,
    });
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const safeFileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ownerId}/${crypto.randomUUID()}-${safeFileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (error)
    return apiError("Could not prepare recording upload.", { status: 500 });

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

  if (insertError)
    return apiError("Could not save recording.", { status: 500 });

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
