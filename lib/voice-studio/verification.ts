/** Pure, read-only checks. A text preview never changes or personalizes recorded audio. */
export const SUPPORTED_AUDIO_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
];
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export function audioExtension(type: string) {
  const mime = type.split(";")[0].trim().toLowerCase();
  return (
    (
      {
        "audio/webm": "webm",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mpeg": "mp3",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
      } as Record<string, string>
    )[mime] ?? null
  );
}
export function validateAudio(type: string, size: number) {
  if (!audioExtension(type))
    return "Choose a supported WAV, MP3, WebM, M4A or Ogg recording.";
  if (!Number.isFinite(size) || size <= 0) return "The recording is empty.";
  if (size > MAX_AUDIO_BYTES) return "Choose a recording smaller than 25 MB.";
  return null;
}
const aliases: Record<string, string> = {
  firstname: "first_name",
  first_name: "first_name",
  agent: "agent_name",
  agent_name: "agent_name",
  brokerage: "brokerage",
  city: "city",
};
export function previewPersonalization(
  text: string,
  values: Record<string, string | null | undefined>,
) {
  const missing = new Set<string>(),
    unsupported = new Set<string>();
  const resolved = text.replace(
    /\[([\w]+)\]|\{\{\s*([\w]+)\s*\}\}/g,
    (raw, a, b) => {
      const name = a || b,
        key = aliases[name.toLowerCase()];
      if (!key) {
        unsupported.add(name);
        return raw;
      }
      const value = values[key]?.trim();
      if (!value || /^(undefined|null)$/i.test(value)) {
        missing.add(name);
        return raw;
      }
      return value;
    },
  );
  const technical = /```|\b(undefined|null)\b|^\s*[\[{]\s*"/i.test(text);
  return {
    resolved,
    missing: [...missing],
    unsupported: [...unsupported],
    technical,
    ready: !missing.size && !unsupported.size && !technical && !!text.trim(),
  };
}
export type VoiceCheck = {
  label: string;
  status: "Passed" | "Warning" | "Blocked" | "Unable to Verify" | "Not started" | "Needs review";
  detail: string;
};
export function voiceChecks(
  asset: {
    approved: boolean;
    storage_path: string;
    playbackUrl?: string | null;
  } | null,
  script: string,
): VoiceCheck[] {
  const p = previewPersonalization(script, {});
  return [
    {
      label: "Recording",
      status: !asset ? "Not started" : asset.playbackUrl ? "Passed" : "Blocked",
      detail: asset?.playbackUrl
        ? "Recording available for playback."
        : !asset ? "Create or upload a recording, then select it for review." : "This recording’s playback link is unavailable. Refresh the library or reopen it in the studio before proceeding.",
    },
    {
      label: "Approval",
      status: !asset ? "Not started" : asset.approved ? "Passed" : "Needs review",
      detail: asset?.approved
        ? "This recording version is approved."
        : !asset ? "Approval becomes available after a recording is saved. Script drafts do not need audio approval." : "Open this recording in the studio, listen to it, then explicitly approve this exact audio version.",
    },
    {
      label: "Audio format",
      status:
        !asset ? "Not started" : /\.(mp3|wav|webm|m4a|ogg)$/i.test(asset.storage_path)
          ? "Passed"
          : "Unable to Verify",
      detail:
        !asset ? "Audio format can be checked after a recording is uploaded or saved." : "File type recognition does not verify the audio codec. Provider-specific encoding compatibility must also be checked before sending.",
    },
    {
      label: "Personalization",
      status:
        !asset || !script.trim() ? "Unable to Verify" : p.technical || p.unsupported.length
          ? "Blocked"
          : p.missing.length
            ? "Warning"
            : "Passed",
      detail: !asset ? "No recording is selected. Text alone cannot verify spoken personalization." : !script.trim() ? "No script text is available for comparison. Listen to the recording and review its content before approval." : p.missing.length
        ? "Text placeholders do not change prerecorded audio. Listen for unresolved variables."
        : "Review the spoken recording against the script.",
    },
    {
      label: "Transcript accuracy",
      status: "Unable to Verify",
      detail:
        "Script text is not a verified audio transcript. Listen before approving.",
    },
    {
      label: "Recipient consent & suppression",
      status: "Unable to Verify",
      detail:
        "Preview does not enroll recipients. Existing sending safeguards must verify each recipient at execution.",
    },
    {
      label: "Provider restrictions & scheduling",
      status: "Unable to Verify",
      detail:
        "No provider request is made in preview. Review the campaign schedule and delivery checks before activation.",
    },
  ];
}
/** Container signature check; provider codec requirements remain a separate pre-send check. */
export function hasAudioSignature(bytes: Uint8Array, path: string): boolean {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.length < 12) return false;
  if (/\.wav$/i.test(path))
    return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE";
  if (/\.webm$/i.test(path))
    return (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  if (/\.m4a$/i.test(path)) return ascii(4, 4) === "ftyp";
  if (/\.ogg$/i.test(path)) return ascii(0, 4) === "OggS";
  if (/\.mp3$/i.test(path))
    return (
      ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
    );
  return false;
}
