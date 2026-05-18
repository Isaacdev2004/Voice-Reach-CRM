import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";

const BodySchema = z.object({
  name: z.string().min(1),
  scriptId: z.string().min(1),
  voiceAssetId: z.string().uuid().optional(),
  provider: z.string().optional().default("mock"),
  contactIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .insert({ owner_id: ownerId, name: body.name, script_id: body.scriptId, voice_asset_id: body.voiceAssetId || null, provider: body.provider, status: "draft" })
    .select("*")
    .single();

  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });

  const recipients = body.contactIds.map((contactId) => ({ owner_id: ownerId, campaign_id: campaign.id, contact_id: contactId }));
  const { error: recipientsError } = await supabaseAdmin.from("campaign_recipients").insert(recipients);

  if (recipientsError) return NextResponse.json({ error: recipientsError.message }, { status: 500 });

  await writeAuditLog({ ownerId, action: "CAMPAIGN_CREATED", entityType: "campaign", entityId: campaign.id, metadata: { recipients: recipients.length } });
  return NextResponse.json({ campaign }, { status: 201 });
}
