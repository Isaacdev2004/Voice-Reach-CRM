import { meterExisting } from "@/lib/billing/ai/endpoint";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { AI_ACTIONS, assistNote } from "@/lib/notes/ai";
import { ownedNote } from "@/lib/notes/server";
import { z } from "zod";
const Schema = z.object({
  noteId: z.string().uuid().optional(),
  source: z.string().trim().min(1).max(30000),
  action: z.enum(AI_ACTIONS),
  approved: z.literal(true),
});
const originalPOST = withApiHandler(async (r) => {
  const owner = await requireUserId(),
    b = Schema.safeParse(await r.json().catch(() => null));
  if (!b.success)
    return apiError("Review your note and choose an AI action.", {
      status: 400,
    });
  try {
    if (b.data.noteId && !(await ownedNote(owner, b.data.noteId)))
      return apiError("Note not found.", { status: 404 });
    return apiOk({
      summary: await assistNote(b.data.source, b.data.action),
      generatedAt: new Date().toISOString(),
      provider: "Claude",
      reviewRequired: true,
    });
  } catch (e) {
    return apiError(
      e instanceof Error && e.message === "UNCONFIGURED"
        ? "AI assistance is not configured yet. You can keep editing and saving your notes."
        : "We could not produce a reliable summary. Your original text is unchanged. Try again or continue editing.",
      { status: 503 },
    );
  }
});

export const POST = meterExisting(originalPOST);
