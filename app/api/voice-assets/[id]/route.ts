import { ownedRows } from "@/lib/delivery/owned-rows";
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
  studioMetadata: z
    .object({
      script: z.string().max(5000).optional(),
      transcript: z.string().max(5000).optional(),
      source: z.enum(["human", "upload", "ai"]).optional(),
      archived: z.boolean().optional(),
    })
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());

  const current = await supabaseAdmin
    .from("voice_assets")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (current.error)
    return apiError("Could not load recording.", { status: 503 });
  if (!current.data) return apiError("Recording not found.", { status: 404 });
  if (
    body.studioMetadata &&
    Object.keys(body.studioMetadata).some((k) => k !== "archived") &&
    current.data.approved
  )
    return apiError(
      "Approved recording content is immutable. Save a new recording version.",
      { status: 409 },
    );
  const updates: Record<string, unknown> = {};
  if (body.studioMetadata)
    updates.studio_metadata = {
      ...current.data.studio_metadata,
      ...body.studioMetadata,
    };
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
    return apiError("Could not update recording.", { status: 500 });
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

export const DELETE = withApiHandler<RouteContext>(
  async (_request, context) => {
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
      return apiError("Could not load recording.", { status: 500 });
    }
    if (!asset)
      return apiError("Recording not found", {
        status: 404,
        code: "not_found",
      });

    // Referenced audio must never be silently unlinked or deleted, even on paused campaigns.
    const campaigns = await supabaseAdmin
      .from("campaigns")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("voice_asset_id", id)
      .limit(1);
    const stepRows = await ownedRows<{
      id: string;
      voice_asset_id?: string;
      conditions?: { voiceAssetId?: string };
    }>("campaign_steps", "id,voice_asset_id,conditions", ownerId).catch(
      () => null,
    );
    const steps = { data: stepRows, error: !stepRows };
    if (campaigns.error || steps.error)
      return apiError("Could not verify recording usage. Try again later.", {
        status: 503,
      });
    if (
      campaigns.data?.length ||
      steps.data?.some(
        (s) => s.voice_asset_id === id || s.conditions?.voiceAssetId === id,
      )
    )
      return apiError(
        "This recording is assigned to a campaign. Replace or unlink its assignments before deleting it.",
        { status: 409 },
      );

    await supabaseAdmin
      .from("voice_profiles")
      .update({ sample_asset_id: null })
      .eq("owner_id", ownerId)
      .eq("sample_asset_id", id);

    const { error: deleteError } = await supabaseAdmin
      .from("voice_assets")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId);

    if (deleteError) {
      const mapped = apiErrorFromSupabase(deleteError);
      if (mapped) return mapped;
      return apiError(
        `Delete failed: ${deleteError.message}. Unlink this recording from any campaign first.`,
        { status: 500 },
      );
    }

    if (asset.storage_path) {
      try {
        await supabaseAdmin.storage
          .from(storageBucket)
          .remove([asset.storage_path]);
      } catch {
        /* storage cleanup is best-effort */
      }
    }

    await writeAuditLog({
      ownerId,
      action: "VOICE_ASSET_DELETED",
      entityType: "voice_asset",
      entityId: null,
      metadata: { deletedAssetId: id, title: asset.title },
    }).catch(() => undefined);

    return apiOk({ ok: true, deletedId: id });
  },
);
