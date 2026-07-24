import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getSupabaseEnv } from "@/lib/server-config";
import { apiErrorFromSupabase } from "@/lib/supabase-errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  scriptId: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());

  const updates: Record<string, string> = {};
  if (body.title) updates.title = body.title;
  if (body.scriptId) updates.script_id = body.scriptId;

  if (Object.keys(updates).length === 0) {
    return apiError("No updates provided", { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) {
    const mapped = apiErrorFromSupabase(error);
    if (mapped) return mapped;
    return apiError(error.message, { status: 500 });
  }

  await writeAuditLog({
    ownerId,
    action: "VOICE_ASSET_UPDATED",
    entityType: "voice_asset",
    entityId: id,
    metadata: updates,
  }).catch(() => undefined);

  return apiOk({ voiceAsset: data });
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  const { storageBucket } = getSupabaseEnv();

  const { data: asset, error: findError } = await supabaseAdmin
    .from("voice_assets")
    .select("id, title, storage_path")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (findError) {
    const mapped = apiErrorFromSupabase(findError);
    if (mapped) return mapped;
    return apiError(findError.message, { status: 500 });
  }
  if (!asset) return apiError("Recording not found", { status: 404, code: "not_found" });

  await supabaseAdmin
    .from("campaigns")
    .update({ voice_asset_id: null, updated_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("voice_asset_id", id);

  if (asset.storage_path) {
    try {
      await supabaseAdmin.storage.from(storageBucket).remove([asset.storage_path]);
    } catch {
      /* storage cleanup is best-effort */
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from("voice_assets")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (deleteError) {
    const mapped = apiErrorFromSupabase(deleteError);
    if (mapped) return mapped;
    return apiError(deleteError.message, { status: 500 });
  }

  await writeAuditLog({
    ownerId,
    action: "VOICE_ASSET_DELETED",
    entityType: "voice_asset",
    entityId: null,
    metadata: { deletedAssetId: id, title: asset.title },
  }).catch(() => undefined);

  return apiOk({ ok: true });
});
