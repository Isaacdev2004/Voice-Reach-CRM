export async function uploadVoiceRecording(
  blob: Blob,
  title: string,
  scriptId: string,
) {
  const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("mpeg") ? "mp3" : "wav";
  const fileName = `${title.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

  const res = await fetch("/api/voice-assets/signed-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scriptId,
      title,
      fileName,
      contentType: blob.type || "audio/webm",
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Upload failed");

  const uploadRes = await fetch(data.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
  });

  if (!uploadRes.ok) throw new Error("Storage upload failed");

  return data.voiceAsset as {
    id: string;
    title: string;
    approved: boolean;
    script_id: string;
    storage_path: string;
  };
}
