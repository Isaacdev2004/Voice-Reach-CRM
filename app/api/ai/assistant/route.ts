import { privateSuccess as apiSuccess } from "@/lib/ai/assistant/http";
import { redactCredentials } from "@/lib/ai/assistant/privacy";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { apiError, withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
import { chatWithClaude, type Turn } from "@/lib/ai/assistant/claude";
import { ContextSchema } from "@/lib/ai/assistant/schema";
const bodySchema = z
  .object({
    requestId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(3000),
    context: ContextSchema.default({ page: "/dashboard" }),
  })
  .strict();
export const GET = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const id = new URL(request.url).searchParams.get("conversationId");
  if (id && !z.string().uuid().safeParse(id).success)
    return apiError("Choose a valid conversation.", { status: 400 });
  if (!id) {
    const r = await supabaseAdmin
      .from("ai_conversations")
      .select("id,title,created_at")
      .eq("owner_id", owner)
      .order("created_at", { ascending: false })
      .limit(30);
    return r.error
      ? apiError("Conversation history is unavailable.", { status: 503 })
      : apiSuccess({ conversations: r.data });
  }
  const [turns, proposals] = await Promise.all([
    supabaseAdmin
      .from("ai_turns")
      .select("id,role,content,result,created_at")
      .eq("owner_id", owner)
      .eq("conversation_id", id)
      .order("position", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("ai_proposals")
      .select("id,payload,status,record_id,created_at")
      .eq("owner_id", owner)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (turns.error || proposals.error)
    return apiError("Conversation history is unavailable.", { status: 503 });
  return apiSuccess({
    turns: (turns.data ?? [])
      .reverse()
      .map((t) => (t.role === "user" ? { ...t, result: null } : t)),
    proposals: (proposals.data ?? []).reverse(),
  });
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError("Check your message and selected records.", {
      status: 400,
    });
  const b = { ...parsed.data, message: redactCredentials(parsed.data.message) };
  try {
    const replay = await supabaseAdmin
      .from("ai_turns")
      .select("conversation_id,result")
      .eq("owner_id", owner)
      .eq("id", b.requestId)
      .maybeSingle();
    if (replay.error)
      return apiError(
        "Conversation storage is unavailable. Please retry later.",
        { status: 503 },
      );
    if (replay.data?.result)
      return apiSuccess({
        conversationId: replay.data.conversation_id,
        ...replay.data.result,
      });
    if (!process.env.ANTHROPIC_API_KEY?.trim())
      return apiError(
        "Ask MyARI is not available yet. Your work has been preserved.",
        { status: 503 },
      );
    const allowed = await supabaseAdmin.rpc("claim_ai_usage", {
      p_owner: owner,
    });
    if (allowed.error)
      return apiError(
        "Ask MyARI is temporarily unavailable. Please retry later.",
        { status: 503 },
      );
    if (!allowed.data)
      return apiError(
        "Your assistant usage limit has been reached. Please try again later.",
        { status: 429 },
      );
    let conversationId = b.conversationId;
    if (conversationId) {
      const c = await supabaseAdmin
        .from("ai_conversations")
        .select("id")
        .eq("owner_id", owner)
        .eq("id", conversationId)
        .maybeSingle();
      if (c.error || !c.data)
        return apiError("Conversation unavailable.", { status: 404 });
    } else {
      const c = await supabaseAdmin
        .from("ai_conversations")
        .insert({ owner_id: owner, title: b.message.slice(0, 80) })
        .select("id")
        .single();
      if (c.error) throw Error("STORE");
      conversationId = c.data.id;
    }
    const old = await supabaseAdmin
      .from("ai_turns")
      .select("role,content")
      .eq("owner_id", owner)
      .eq("conversation_id", conversationId)
      .order("position", { ascending: false })
      .limit(12);
    if (old.error) throw Error("STORE");
    const reply = await chatWithClaude(
      {
        message: b.message,
        history: (old.data ?? []).reverse() as Turn[],
        context: b.context,
        signal: request.signal,
      },
      undefined,
      owner,
    );
    const saved = await supabaseAdmin.rpc("save_ai_exchange", {
      p_owner: owner,
      p_conversation: conversationId,
      p_request: b.requestId,
      p_message: b.message,
      p_result: reply,
    });
    if (saved.error) throw Error("STORE");
    await writeAuditLog({
      ownerId: owner,
      action: "AI_ASSISTANT_USED",
      entityType: "ai_conversation",
      entityId: conversationId,
      metadata: {
        ...reply.usage,
        model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
      },
    }).catch(() => undefined);
    return apiSuccess({ conversationId, ...saved.data });
  } catch (e) {
    const rate = e instanceof Error && e.message === "AI_RATE_LIMIT";
    return apiError(
      rate
        ? "The assistant is busy. Please retry shortly."
        : "Ask MyARI couldn't complete this request. No proposed action was executed. Please retry.",
      { status: rate ? 429 : 503 },
    );
  }
});
