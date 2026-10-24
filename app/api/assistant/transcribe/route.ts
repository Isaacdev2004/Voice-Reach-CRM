import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { requireAssistantEnabled } from "@/lib/assistant/config";
import { reserveUsage, AssistantFailure, put } from "@/lib/assistant/store";
import { POST as transcribe } from "@/app/api/notes/transcribe/route";
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  try {
    await requireAssistantEnabled(owner);
    if (request.headers.get("X-MyARI-Owner") !== owner)
      return apiError("Account changed", { status: 409 });
    const id = crypto.randomUUID();
    await reserveUsage(owner, id);
    const response = await transcribe(request, undefined);
    const payload = await response
      .clone()
      .json()
      .catch(() => ({}));
    await put(owner, "transcription", id, "attempt", {
      status: response.status,
      model: "whisper-1",
      durationSeconds:
        typeof payload.processedSeconds === "number"
          ? payload.processedSeconds
          : null,
      cost: "unavailable; provider billing required",
      audioStored: false,
    });
    return response;
  } catch (e) {
    return apiError(
      e instanceof AssistantFailure
        ? e.message
        : "Transcription is unavailable",
      { status: e instanceof AssistantFailure ? e.status : 503 },
    );
  }
});
