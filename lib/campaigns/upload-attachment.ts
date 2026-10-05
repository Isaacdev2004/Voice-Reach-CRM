import { safeFetch } from "@/lib/api-response";
import type { CampaignStepAttachment } from "@/lib/campaigns/attachments";

export async function uploadCampaignAttachment(
  file: File,
  channel: "sms" | "email",
): Promise<CampaignStepAttachment> {
  const envelope = await safeFetch<{
    attachment: CampaignStepAttachment;
    signedUrl: string;
  }>("/api/campaign-attachments/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      channel,
    }),
  });

  if (!envelope.success) {
    throw new Error(envelope.error || "Could not start attachment upload");
  }

  const uploadRes = await fetch(envelope.data.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload failed. Try a smaller file or a supported format.");
  }

  return envelope.data.attachment;
}
