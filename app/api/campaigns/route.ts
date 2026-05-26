import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BodySchema = z.object({
  name: z.string().min(1),
  scriptId: z.string().min(1),
  voiceAssetId: z.string().uuid().optional(),
  provider: z.string().optional().default("mock"),
  contactIds: z.array(z.string().uuid()).min(1),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .select("id, name, status, script_id, provider, created_at, updated_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });
  return apiOk({ campaigns: data ?? [] });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .insert({
      owner_id: ownerId,
      name: body.name,
      script_id: body.scriptId,
      voice_asset_id: body.voiceAssetId || null,
      provider: body.provider,
      status: "draft",
    })
    .select("*")
    .single();

  if (campaignError) return apiError(campaignError.message, { status: 500 });

  const recipients = body.contactIds.map((contactId) => ({
    owner_id: ownerId,
    campaign_id: campaign.id,
    contact_id: contactId,
  }));

  const { error: recipientsError } = await supabaseAdmin
    .from("campaign_recipients")
    .insert(recipients);
  if (recipientsError) return apiError(recipientsError.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_CREATED",
    entityType: "campaign",
    entityId: campaign.id,
    metadata: { recipients: recipients.length },
  });

  return apiOk({ campaign }, { status: 201 });
});
