import { createHash } from "node:crypto";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readPreview } from "@/lib/campaigns/library-server";
import {
  CampaignImportSchema,
  duplicateBlueprint,
} from "@/lib/campaigns/library-transfer";
import { workspaceErrors } from "@/lib/campaigns/workspace";
import { assertAttachmentOwnership } from "@/lib/campaigns/attachment-ownership";
import { persistSteps } from "@/lib/campaigns/engine";
import { writeAuditLog } from "@/lib/audit";
const Body = z
  .object({
    sourceId: z.string().uuid().nullable(),
    version: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    requestId: z.string().uuid(),
    confirmation: z.literal("CREATE_DRAFT_REVISION"),
    draft: CampaignImportSchema,
  })
  .strict();
const hash = (v: unknown) =>
  createHash("sha256")
    .update(
      JSON.stringify(v, (_k, x) =>
        x && typeof x === "object" && !Array.isArray(x)
          ? Object.fromEntries(
              Object.entries(x).sort(([a], [b]) => a.localeCompare(b)),
            )
          : x,
      ),
    )
    .digest("hex");
const version = (p: NonNullable<Awaited<ReturnType<typeof readPreview>>>) =>
  hash({ campaign: p.campaign, steps: p.steps });
const supportedConditions = new Set([
  "voiceAssetId",
  "attachments",
  "reviewRequest",
  "resourceKey",
]);
export const GET = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const id = new URL(request.url).searchParams.get("id");
  if (!z.string().uuid().safeParse(id).success)
    return apiError("Invalid campaign.", { status: 400 });
  try {
    const p = await readPreview(owner, id!);
    if (!p) return apiError("Campaign not found.", { status: 404 });
    const draft = duplicateBlueprint(p);
    draft.name = p.campaign.name;
    draft.audience = p.campaign.audience ?? draft.audience;
    draft.steps = draft.steps.map((s) =>
      s.type === "voicemail" && !s.voiceAssetId
        ? {
            ...s,
            voiceAssetId: (p.campaign as { voice_asset_id?: string })
              .voice_asset_id,
          }
        : s,
    );
    return apiOk({
      preview: p,
      draft,
      version: version(p),
      unsupportedRules: p.steps.some((s) =>
        Object.keys(s.conditions ?? {}).some(
          (k) => !supportedConditions.has(k),
        ),
      ),
    });
  } catch {
    return apiError(
      "Campaign information is unavailable. Your existing data is unchanged.",
      { status: 503 },
    );
  }
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = Body.parse(await request.json());
  const errors = workspaceErrors(body.draft);
  if (errors.length)
    return apiError(errors[0], { status: 400, code: "validation_error" });
  let provider = "mock";
  if (body.sourceId) {
    const source = await readPreview(owner, body.sourceId);
    if (!source) return apiError("Campaign not found.", { status: 404 });
    if (version(source) !== body.version)
      return apiError(
        "The source campaign changed. Reload it and review your revision before saving.",
        { status: 409, code: "stale_campaign" },
      );
    if (
      source.steps.some((s) =>
        Object.keys(s.conditions ?? {}).some(
          (k) => !supportedConditions.has(k),
        ),
      )
    )
      return apiError(
        "This campaign has custom delivery rules that this editor cannot safely copy.",
        { status: 409, code: "unsupported_rules" },
      );
    provider = source.campaign.provider || "mock";
  } else if (body.version)
    return apiError("Invalid source version.", { status: 400 });
  try {
    for (const a of body.draft.steps.flatMap((s) => s.attachments ?? []))
      assertAttachmentOwnership(owner, a.storagePath);
  } catch {
    return apiError("Attachment does not belong to this account.", {
      status: 403,
    });
  }
  // Existing recordings are selectable only if owned; no provider or approved-audio changes.
  for (const id of new Set(
    body.draft.steps.map((s) => s.voiceAssetId).filter((v): v is string => !!v),
  )) {
    const r = await supabaseAdmin
      .from("voice_assets")
      .select("id")
      .eq("id", id)
      .eq("owner_id", owner)
      .maybeSingle();
    if (r.error || !r.data)
      return apiError(
        "A linked recording cannot be verified for this account.",
        { status: 400 },
      );
  }
  const signature =
    "workspace-" +
    hash({
      source: body.sourceId,
      version: body.version,
      draft: body.draft,
      provider,
    });
  const existing = await supabaseAdmin
    .from("campaigns")
    .select("id,script_id,status")
    .eq("id", body.requestId)
    .eq("owner_id", owner)
    .maybeSingle();
  if (existing.error)
    return apiError(
      "Could not verify this save. No automatic retry was attempted.",
      { status: 503 },
    );
  if (existing.data) {
    // Never overwrite a retry target, a newer edit, or an incompletely saved draft.
    const steps = await supabaseAdmin
      .from("campaign_steps")
      .select(
        "step_order,type,title,description,delay_minutes,day_label,time_label,conditions,voice_asset_id",
      )
      .eq("campaign_id", body.requestId)
      .eq("owner_id", owner)
      .order("step_order");
    const wanted = body.draft.steps;
    const complete =
      !steps.error &&
      steps.data?.length === wanted.length &&
      steps.data.every((s, i) => {
        const w = wanted[i];
        return (
          s.step_order === w.order &&
          s.type === w.type &&
          s.title === w.title &&
          s.description === w.description &&
          s.delay_minutes === (w.delayMinutes ?? 0) &&
          s.time_label === (w.timeLabel ?? null) &&
          s.day_label === (w.dayLabel ?? null) &&
          hash(s.conditions ?? {}) ===
            hash({
              ...(w.voiceAssetId ? { voiceAssetId: w.voiceAssetId } : {}),
              ...(w.attachments?.length ? { attachments: w.attachments } : {}),
              ...(w.reviewRequest ? { reviewRequest: w.reviewRequest } : {}),
              ...(w.resourceKey ? { resourceKey: w.resourceKey } : {}),
            })
        );
      });
    if (
      existing.data.script_id === signature &&
      existing.data.status === "draft" &&
      complete
    ) {
      const audit = await supabaseAdmin
        .from("audit_logs")
        .select("id")
        .eq("owner_id", owner)
        .eq("entity_id", body.requestId)
        .eq("action", "CAMPAIGN_WORKSPACE_DRAFT_CREATED")
        .limit(1);
      if (audit.error)
        return apiError(
          "Save evidence cannot be verified. Inspect Campaigns before retrying.",
          { status: 503, code: "inspect_save" },
        );
      if (!audit.data?.length)
        await writeAuditLog({
          ownerId: owner,
          action: "CAMPAIGN_WORKSPACE_DRAFT_CREATED",
          entityType: "campaign",
          entityId: body.requestId,
          metadata: {
            blueprint: body.draft,
            sourceCampaignId: body.sourceId,
            sourceVersion: body.version,
          },
        });
      return apiOk({
        campaignId: body.requestId,
        status: "draft",
        alreadySaved: true,
      });
    }
    return apiError(
      "This save requires inspection. Open Campaigns before retrying; no existing record was overwritten.",
      { status: 409, code: "inspect_save" },
    );
  }
  const inserted = await supabaseAdmin
    .from("campaigns")
    .insert({
      id: body.requestId,
      owner_id: owner,
      name: body.draft.name,
      script_id: signature,
      provider,
      status: "draft",
    })
    .select("id")
    .single();
  if (inserted.error)
    return apiError(
      "Draft creation could not be confirmed. Inspect Campaigns before retrying.",
      { status: 409, code: "inspect_save" },
    );
  try {
    await persistSteps(
      owner,
      body.requestId,
      body.draft.steps.map((s) => ({
        ...s,
        conditions: {
          ...(s.voiceAssetId ? { voiceAssetId: s.voiceAssetId } : {}),
          ...(s.attachments?.length ? { attachments: s.attachments } : {}),
          ...(s.reviewRequest ? { reviewRequest: s.reviewRequest } : {}),
          ...(s.resourceKey ? { resourceKey: s.resourceKey } : {}),
        },
      })),
    );
    await writeAuditLog({
      ownerId: owner,
      action: "CAMPAIGN_WORKSPACE_DRAFT_CREATED",
      entityType: "campaign",
      entityId: body.requestId,
      metadata: {
        blueprint: body.draft,
        sourceCampaignId: body.sourceId,
        sourceVersion: body.version,
      },
    });
    return apiOk({
      campaignId: body.requestId,
      status: "draft",
      message:
        "New draft saved. Original campaign and enrollment schedules are unchanged.",
    });
  } catch {
    return apiError(
      "Draft save is incomplete or uncertain. Inspect Campaigns before retrying. Your source campaign is unchanged.",
      { status: 503, code: "inspect_save" },
    );
  }
});
