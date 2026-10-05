import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  validateAttachmentUpload,
  type CampaignStepAttachment,
} from "@/lib/campaigns/attachments";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  channel: z.enum(["sms", "email"]),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  const validationError = validateAttachmentUpload({
    mimeType: body.contentType,
    sizeBytes: body.sizeBytes,
    channel: body.channel,
  });
  if (validationError) return apiError(validationError, { status: 400 });

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
  const safeFileName = body.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const attachmentId = crypto.randomUUID();
  const storagePath = `${ownerId}/attachments/${attachmentId}-${safeFileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);
  if (error) return apiError(error.message, { status: 500 });

  const attachment: CampaignStepAttachment = {
    id: attachmentId,
    storagePath,
    fileName: body.fileName,
    mimeType: body.contentType,
    sizeBytes: body.sizeBytes,
  };

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_ATTACHMENT_UPLOAD_CREATED",
    entityType: "campaign_attachment",
    entityId: attachmentId,
    metadata: { storagePath, channel: body.channel },
  });

  return apiOk({
    attachment,
    signedUrl: data.signedUrl,
    path: data.path,
    token: data.token,
  });
});
