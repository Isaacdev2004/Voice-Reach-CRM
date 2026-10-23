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

  if (error) return apiError("Information could not be saved or loaded. Please try again.", { status: 500 });
  return apiOk({ campaigns: data ?? [] });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  const ids = [...new Set(body.contactIds)];
  const { data: ownedContacts, error: ownershipError } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", ownerId)
    .in("id", ids);
  if (ownershipError || ownedContacts?.length !== ids.length)
    return apiError("One or more contacts are unavailable.", { status: 404 });
  if (body.voiceAssetId) {
    const { data: voice } = await supabaseAdmin
      .from("voice_assets")
      .select("id,approved")
      .eq("owner_id", ownerId)
      .eq("id", body.voiceAssetId)
      .maybeSingle();
    if (!voice?.approved)
      return apiError("Choose an approved recording from your workspace.", {
        status: 403,
      });
  }

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

  if (campaignError) return apiError("Information could not be saved or loaded. Please try again.", { status: 500 });

  const recipients = ids.map((contactId) => ({
    owner_id: ownerId,
    campaign_id: campaign.id,
    contact_id: contactId,
  }));

  const { error: recipientsError } = await supabaseAdmin
    .from("campaign_recipients")
    .insert(recipients);
  if (recipientsError)
    return apiError("Information could not be saved or loaded. Please try again.", { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_CREATED",
    entityType: "campaign",
    entityId: campaign.id,
    metadata: { recipients: recipients.length },
  });

  return apiOk({ campaign }, { status: 201 });
});
