import { assertAttachmentOwnership } from "./attachment-ownership";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CampaignStepAttachment = {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

export type StepConditions = {
  voiceAssetId?: string;
  attachments?: CampaignStepAttachment[];
};

export const SMS_MMS_MIME_TYPES = ["image/jpeg", "image/png", "image/gif"] as const;
export const EMAIL_ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
] as const;

export const SMS_MMS_MAX_BYTES = 5 * 1024 * 1024;
export const EMAIL_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const SMS_MAX_ATTACHMENTS = 1;
export const EMAIL_MAX_ATTACHMENTS = 5;

export function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";
}

export function attachmentsFromConditions(
  conditions: Record<string, unknown> | null | undefined,
): CampaignStepAttachment[] {
  const raw = conditions?.attachments;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is CampaignStepAttachment =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as CampaignStepAttachment).storagePath === "string" &&
      typeof (item as CampaignStepAttachment).fileName === "string" &&
      typeof (item as CampaignStepAttachment).mimeType === "string",
  );
}

export function validateAttachmentUpload(params: {
  mimeType: string;
  sizeBytes: number;
  channel: "sms" | "email";
}) {
  const allowed =
    params.channel === "sms" ? SMS_MMS_MIME_TYPES : EMAIL_ATTACHMENT_MIME_TYPES;
  if (!(allowed as readonly string[]).includes(params.mimeType)) {
    return `File type not supported for ${params.channel === "sms" ? "MMS" : "email"}.`;
  }
  const max = params.channel === "sms" ? SMS_MMS_MAX_BYTES : EMAIL_ATTACHMENT_MAX_BYTES;
  if (params.sizeBytes > max) {
    const mb = Math.round(max / (1024 * 1024));
    return `File is too large. Max ${mb} MB for ${params.channel === "sms" ? "MMS" : "email"}.`;
  }
  return null;
}

export async function signStoragePath(
  ownerId: string,
  storagePath: string,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  assertAttachmentOwnership(ownerId, storagePath);
  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket())
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function signAttachmentsForSend(
  ownerId: string,
  attachments: CampaignStepAttachment[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of attachments) {
    const signed = await signStoragePath(ownerId, file.storagePath);
    if (!signed) throw new Error("An attachment is unavailable. No message should be sent without every selected attachment.");
    urls.push(signed);
  }
  return urls;
}

export async function downloadAttachmentBase64(
  ownerId: string,
  attachment: CampaignStepAttachment,
): Promise<{ filename: string; content: string } | null> {
  assertAttachmentOwnership(ownerId, attachment.storagePath);
  const { data, error } = await supabaseAdmin.storage
    .from(storageBucket())
    .download(attachment.storagePath);
  if (error || !data) throw new Error("A selected attachment could not be loaded.");
  const buffer = Buffer.from(await data.arrayBuffer());
  if (!buffer.length || buffer.length > EMAIL_ATTACHMENT_MAX_BYTES) throw new Error("Attachment exceeds the verified email file limit.");
  return {
    filename: attachment.fileName,
    content: buffer.toString("base64"),
  };
}

export async function emailAttachmentsForSend(
  ownerId: string,
  attachments: CampaignStepAttachment[],
): Promise<Array<{ filename: string; content: string }>> {
  const out: Array<{ filename: string; content: string }> = [];
  for (const file of attachments) {
    const downloaded = await downloadAttachmentBase64(ownerId, file);
    if (downloaded) out.push(downloaded);
  }
  const total=out.reduce((sum,file)=>sum+Buffer.from(file.content,"base64").length,0);
  if(total>EMAIL_ATTACHMENT_MAX_BYTES)throw new Error("Combined email attachments exceed 10 MB.");
  return out;
}
