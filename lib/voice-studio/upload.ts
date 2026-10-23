import { audioExtension, validateAudio } from "./verification";
export async function uploadVoiceRecording(
  blob: Blob,
  title: string,
  scriptId: string,
) {
  const invalid = validateAudio(blob.type, blob.size);
  if (invalid) throw new Error(invalid);
  const ext = audioExtension(blob.type)!;
  const fileName = `${title.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

  const res = await fetch("/api/voice-assets/signed-upload", {
    method: "POST",
    signal: AbortSignal.timeout(30000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scriptId,
      title,
      fileName,
      contentType: blob.type.split(";")[0],
      size: blob.size,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");

  const uploadRes = await fetch(data.signedUrl, {
    method: "PUT",
    signal: AbortSignal.timeout(60000),
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
  });

  if (!uploadRes.ok) {
    await fetch(`/api/voice-assets/${data.voiceAsset.id}`, {
      method: "DELETE",
    }).catch(() => undefined);
    throw new Error(
      "Recording could not be uploaded. Your audio is still available to retry.",
    );
  }

  return data.voiceAsset as {
    id: string;
    title: string;
    approved: boolean;
    script_id: string;
    storage_path: string;
  };
}
