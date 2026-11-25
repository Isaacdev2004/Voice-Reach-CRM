import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DraftSnapshot } from "@/lib/campaigns/draft-schema";
import { assertAttachmentOwnership } from "@/lib/campaigns/attachment-ownership";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const GET = withApiHandler(async (request: Request) => {
  const owner = await requireUserId(),
    url = new URL(request.url),
    id = z.string().uuid().parse(url.searchParams.get("id"));
  const { data, error } = await supabaseAdmin
    .from("campaign_editor_drafts")
    .select("campaign_id,revision,snapshot,state,updated_at")
    .eq("owner_id", owner)
    .eq("campaign_id", id)
    .maybeSingle();
  if (error)
    return apiError(
      "Draft storage unavailable. Your local changes have not been saved to the server.",
      { status: 503 },
    );
  if (!data) return apiSuccess({ draft: null, versions: [], ownerId: owner });
  let versionQuery = supabaseAdmin
    .from("campaign_editor_versions")
    .select("revision,saved_at")
    .eq("owner_id", owner)
    .eq("campaign_id", id)
    .order("revision", { ascending: false })
    .limit(100);
  if (url.searchParams.has("beforeRevision"))
    versionQuery = versionQuery.lt(
      "revision",
      z.coerce
        .number()
        .int()
        .positive()
        .parse(url.searchParams.get("beforeRevision")),
    );
  const versions = await versionQuery;
  if (versions.error)
    return apiError("Version history unavailable.", { status: 503 });
  let version = null;
  if (url.searchParams.has("revision")) {
    const revision = z.coerce
      .number()
      .int()
      .nonnegative()
      .parse(url.searchParams.get("revision"));
    const result = await supabaseAdmin
      .from("campaign_editor_versions")
      .select("revision,snapshot,saved_at")
      .eq("owner_id", owner)
      .eq("campaign_id", id)
      .eq("revision", revision)
      .maybeSingle();
    if (result.error) return apiError("Version unavailable.", { status: 503 });
    if (!result.data) return apiError("Version not found.", { status: 404 });
    version = result.data;
  }
  return apiSuccess({
    draft: data,
    versions: versions.data,
    version,
    ownerId: owner,
  });
});
const Body = z.object({
  campaignId: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  baseUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
  operationId: z.string().uuid(),
  snapshot: DraftSnapshot,
});
export const POST = withApiHandler(async (request: Request) => {
  const owner = await requireUserId();
  if (Number(request.headers.get("content-length") || 0) > 1500000)
    return apiError("Draft too large.", {
      status: 413,
      code: "draft_too_large",
    });
  const reader = request.body?.getReader(),
    decoder = new TextDecoder();
  let text = "",
    size = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 1500000) {
        await reader.cancel();
        return apiError("Draft too large.", {
          status: 413,
          code: "draft_too_large",
        });
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  }
  if (text.length > 1500000)
    return apiError("Draft too large.", {
      status: 413,
      code: "draft_too_large",
    });
  const b = Body.parse(JSON.parse(text));
  for (const step of b.snapshot.steps) {
    if (!step.voiceAssetId) continue;
    const voice = await supabaseAdmin
      .from("voice_assets")
      .select("id")
      .eq("owner_id", owner)
      .eq("id", step.voiceAssetId)
      .maybeSingle();
    if (voice.error)
      return apiError(
        "Recording ownership could not be verified. Draft retained locally.",
        { status: 503 },
      );
    if (!voice.data)
      return apiError("Choose a recording from your own workspace.", {
        status: 400,
        code: "draft_validation_error",
      });
  }
  for (const s of b.snapshot.steps)
    for (const a of s.attachments ?? [])
      try {
        assertAttachmentOwnership(owner, a.storagePath);
      } catch {
        return apiError("Choose an attachment from your own workspace.", {
          status: 400,
          code: "draft_validation_error",
        });
      }
  const { data, error } = await supabaseAdmin.rpc(
    "save_campaign_editor_draft",
    {
      p_owner: owner,
      p_id: b.campaignId,
      p_expected: b.expectedRevision,
      p_operation: b.operationId,
      p_snapshot: b.snapshot,
      p_base_updated_at: b.baseUpdatedAt ?? null,
    },
  );
  if (error) {
    const conflict =
      /revision_conflict|draft_locked|revision_required|idempotency_mismatch/.test(
        error.message,
      );
    return apiError(
      conflict
        ? "The server has a newer or locked version. Your edits are preserved locally. Review version history before retrying."
        : "Draft save failed. Your edits remain in the editor; retry when available.",
      {
        status: conflict ? 409 : 503,
        code: conflict ? "revision_conflict" : "draft_save_failed",
      },
    );
  }
  return apiSuccess(data);
});
