import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const ShareSchema = z.object({
  partnerId: z.string().uuid(),
  assetType: z.enum(["campaign", "voice_asset", "script", "contact_list", "note"]),
  assetId: z.string().uuid(),
  permission: z.enum(["view", "edit", "approve"]).default("view"),
});

const ApproveSchema = z.object({
  id: z.string().uuid(),
  approvalStatus: z.enum(["approved", "rejected"]),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = ShareSchema.parse(await request.json());

  const { data, error } = await supabaseAdmin
    .from("partner_shared_assets")
    .insert({
      owner_id: ownerId,
      partner_id: body.partnerId,
      asset_type: body.assetType,
      asset_id: body.assetId,
      permission: body.permission,
    })
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "PARTNER_ASSET_SHARED",
    entityType: "partner_shared_asset",
    entityId: null,
    metadata: { partnerId: body.partnerId, assetType: body.assetType, assetId: body.assetId },
  });

  return apiSuccess({ sharedAsset: data });
});

export const PATCH = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = ApproveSchema.parse(await request.json());

  const { data, error } = await supabaseAdmin
    .from("partner_shared_assets")
    .update({
      approval_status: body.approvalStatus,
      approved_at: body.approvalStatus === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", body.id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: `PARTNER_ASSET_${body.approvalStatus.toUpperCase()}`,
    entityType: "partner_shared_asset",
    entityId: null,
    metadata: { id: body.id, status: body.approvalStatus },
  });

  return apiSuccess({ sharedAsset: data });
});
