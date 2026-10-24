import { apiOk } from "@/lib/api-response";
import { assistantHandler } from "@/lib/assistant/api";
import { entries } from "@/lib/assistant/store";
import { z } from "zod";
export const GET = assistantHandler(async (request, owner) => {
  const { savedSettings } = await import("@/lib/assistant/reads");
  const settings = await savedSettings(owner),
    cutoff =
      Date.now() -
      (settings?.brandKit?.assistantPreferences?.retainDays ?? 30) * 86400000;
  const id = new URL(request.url).searchParams.get("conversationId");
  if (id) {
    if ((await entries(owner, "deleted", id, 1)).length)
      return apiOk({ messages: [] });
    z.string().uuid().parse(id);
    return apiOk({
      messages: (await entries(owner, "message", id, 40))
        .filter((e) => Date.parse(e.created_at) >= cutoff)
        .reverse()
        .map((e) => ({ id: e.id, at: e.created_at, ...e.metadata })),
    });
  }
  const recent = await entries(owner, "message", undefined, 50);
  return apiOk({
    recent: recent
      .filter(
        (e) => e.metadata.role === "user" && Date.parse(e.created_at) >= cutoff,
      )
      .map((e) => ({
        id: e.id,
        at: e.created_at,
        message: e.metadata.content,
        conversationId: e.entity_id,
      })),
    usage: (await entries(owner, "tokens", undefined, 100)).map((e) => ({
      at: e.created_at,
      ...e.metadata,
    })),
  });
});
export const DELETE = assistantHandler(async (request, owner) => {
  const { assistantBody } = await import("@/lib/assistant/body");
  const body = z
    .object({
      conversationId: z.string().uuid(),
      confirmation: z.literal("DELETE_CONVERSATION"),
    })
    .strict()
    .parse(await assistantBody(request));
  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
  const { put, AssistantFailure } = await import("@/lib/assistant/store");
  const turns = await entries(owner, "turn", body.conversationId, 30);
  const active = turns.find(
    (t) =>
      t.metadata.state === "started" &&
      !turns.some(
        (f) =>
          f.metadata.requestId === t.metadata.requestId &&
          f.metadata.state === "finished",
      ) &&
      Date.now() - Date.parse(t.created_at) < 120000,
  );
  if (active)
    throw new AssistantFailure(
      "Wait for the active response before deleting this conversation",
      409,
    );
  await put(owner, "deleted", body.conversationId, "deleted", {
    at: new Date().toISOString(),
  });
  const r = await supabaseAdmin
    .from("audit_logs")
    .delete()
    .eq("owner_id", owner)
    .eq("entity_type", "assistant_message")
    .eq("entity_id", body.conversationId);
  if (r.error)
    throw new AssistantFailure(
      "Conversation deletion could not be confirmed",
      503,
    );
  return apiOk({
    deleted: true,
    notice:
      "Conversation messages deleted. Approved CRM records and minimal execution/usage audit records are retained.",
  });
});
