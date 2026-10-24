import {
  aiEntitlement,
  aiMeteringEnabled,
} from "@/lib/billing/ai/entitlements";
import {
  reserveAi,
  settleAi,
  type AiReservation,
} from "@/lib/billing/ai/meter";
import { AssistantFailure } from "@/lib/assistant/store";
import { wavSeconds } from "@/lib/assistant/audio";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
const MAX = 20 * 1024 * 1024;
const TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
]);
export const POST = withApiHandler(async (r) => {
  const owner = await requireUserId();
  let reservation: AiReservation = null;
  // The proxy/platform must also enforce a request-body cap; do not buffer unbounded uploads.
  if (Number(r.headers.get("content-length")) > MAX + 65536)
    return apiError("Choose an audio file under 20 MB.", { status: 413 });
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key)
    return apiError(
      "Audio transcription is not configured. Dictate a recap in a supported browser or type it instead.",
      { status: 503 },
    );
  try {
    const reader = r.body?.getReader();
    if (!reader) return apiError("Choose an audio file.", { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX + 65536) {
        await reader.cancel();
        return apiError("Choose an audio file under 20 MB.", { status: 413 });
      }
      chunks.push(part.value);
    }
    const bounded = new Request("http://localhost", {
      method: "POST",
      headers: { "content-type": r.headers.get("content-type") ?? "" },
      body: Buffer.concat(chunks),
    });
    const form = await bounded.formData(),
      file = form.get("audio");
    if (form.get("consent") !== "confirmed")
      return apiError(
        "Confirm authorization and recording consent before processing.",
        { status: 400 },
      );
    if (
      !(file instanceof File) ||
      !TYPES.has(file.type) ||
      file.size === 0 ||
      file.size > MAX
    )
      return apiError("Choose a supported audio file under 20 MB.", {
        status: 400,
      });
    let measuredSeconds: number | null = null;
    if (aiMeteringEnabled()) {
      const e = await aiEntitlement(owner);
      if (e.tier) {
        try {
          measuredSeconds = wavSeconds(
            new Uint8Array(await file.arrayBuffer()),
          );
        } catch (error) {
          return apiError(
            error instanceof Error
              ? error.message
              : "Audio duration could not be verified",
            { status: 400 },
          );
        }
        reservation = await reserveAi(
          owner,
          "transcription_seconds",
          `transcribe:${crypto.randomUUID()}`,
          measuredSeconds,
        );
      } else if (!e.verified || !["active", "trialing"].includes(e.status))
        return apiError("AI subscription could not be verified", {
          status: 403,
        });
    }
    const data = new FormData();
    data.set(
      "file",
      file,
      "recording." +
        (file.type.includes("wav")
          ? "wav"
          : file.type.includes("mpeg")
            ? "mp3"
            : file.type.includes("ogg")
              ? "ogg"
              : file.type.includes("webm")
                ? "webm"
                : "m4a"),
    );
    data.set("model", "whisper-1");
    data.set("response_format", "verbose_json");
    data.set("temperature", "0");
    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: data,
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) throw Error();
    const result = await response.json();
    if (
      typeof result.text !== "string" ||
      !result.text.trim() ||
      result.text.length > 30000
    )
      throw Error();
    await settleAi(reservation, true);
    return apiOk({
      processedSeconds:
        measuredSeconds ??
        (typeof result.duration === "number"
          ? Math.ceil(result.duration)
          : null),
      transcript: result.text,
      segments: Array.isArray(result.segments)
        ? result.segments
            .slice(0, 500)
            .map(
              (s: {
                start: number;
                end: number;
                text: string;
                avg_logprob: number;
                no_speech_prob: number;
              }) => ({
                start: s.start,
                end: s.end,
                text: s.text,
                uncertain: s.avg_logprob < -1 || s.no_speech_prob > 0.5,
              }),
            )
        : [],
      warning:
        "Machine transcription can contain errors. Review names, addresses, dates, and financial figures before saving. Audio is processed transiently and is not stored by MyARI; provider retention policy applies.",
    });
  } catch (error) {
    if (error instanceof AssistantFailure)
      return apiError(error.message, { status: error.status });
    if (reservation) await settleAi(reservation, false).catch(() => undefined);
    return apiError(
      "The recording could not be transcribed. Check the audio and try again, or type a recap. Your notes are unchanged.",
      { status: 503 },
    );
  }
});
