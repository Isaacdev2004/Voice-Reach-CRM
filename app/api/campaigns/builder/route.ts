import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { evaluateEligibility } from "@/lib/compliance";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const StepSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: z.enum(["voicemail", "avatar_video", "email", "sms", "retargeting", "callback"]),
  title: z.string(),
  description: z.string(),
  dayLabel: z.string(),
  timeLabel: z.string(),
  status: z.enum(["sent", "active", "pending", "draft"]),
});

const BlueprintSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  audience: z.string(),
  durationDays: z.number(),
  steps: z.array(StepSchema).min(1, "Add at least one automation step"),
  goals: z.array(z.string()),
});

const BodySchema = z.object({
  action: z.enum(["template", "activate"]),
  campaign: BlueprintSchema,
  campaignId: z.string().uuid().optional(),
});

async function upsertCampaign(
  ownerId: string,
  blueprint: z.infer<typeof BlueprintSchema>,
  status: "draft" | "queued",
  existingId?: string,
) {
  const scriptId = `builder-${blueprint.id}`;

  if (existingId) {
    const { data, error } = await supabaseAdmin
      .from("campaigns")
      .update({
        name: blueprint.name,
        script_id: scriptId,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingId)
      .eq("owner_id", ownerId)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from("campaigns")
    .insert({
      owner_id: ownerId,
      name: blueprint.name,
      script_id: scriptId,
      provider: "mock",
      status,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function enrollEligibleContacts(ownerId: string, campaignId: string) {
  const { data: contacts, error } = await supabaseAdmin
    .from("contacts")
    .select("id, phone, dnc, consent_records(*)")
    .eq("owner_id", ownerId);

  if (error) throw new Error(error.message);

  const eligible =
    contacts?.filter((c) => evaluateEligibility(c).eligible).map((c) => c.id) ?? [];

  if (eligible.length === 0) {
    return { enrolled: 0, eligible: 0, total: contacts?.length ?? 0 };
  }

  const rows = eligible.map((contactId) => ({
    owner_id: ownerId,
    campaign_id: campaignId,
    contact_id: contactId,
    eligibility_status: "eligible",
    eligibility_issues: [],
    delivery_status: "not_sent",
  }));

  const { error: insertError } = await supabaseAdmin
    .from("campaign_recipients")
    .upsert(rows, { onConflict: "campaign_id,contact_id", ignoreDuplicates: true });

  if (insertError) throw new Error(insertError.message);

  return {
    enrolled: eligible.length,
    eligible: eligible.length,
    total: contacts?.length ?? 0,
  };
}

export async function POST(request: Request) {
  try {
    const ownerId = await requireUserId();
    const body = BodySchema.parse(await request.json());
    const { action, campaign: blueprint, campaignId: existingId } = body;

    if (action === "template") {
      const record = await upsertCampaign(ownerId, blueprint, "draft", existingId);

      await writeAuditLog({
        ownerId,
        action: "CAMPAIGN_TEMPLATE_SAVED",
        entityType: "campaign",
        entityId: record.id,
        metadata: { blueprint, audience: blueprint.audience, stepCount: blueprint.steps.length },
      });

      return NextResponse.json({
        ok: true,
        campaignId: record.id,
        status: "draft",
        message: "Template saved. You can activate when ready.",
      });
    }

    const record = await upsertCampaign(ownerId, blueprint, "queued", existingId);
    const enrollment = await enrollEligibleContacts(ownerId, record.id);

    await writeAuditLog({
      ownerId,
      action: "CAMPAIGN_ACTIVATED",
      entityType: "campaign",
      entityId: record.id,
      metadata: {
        blueprint,
        enrollment,
        stepCount: blueprint.steps.length,
        durationDays: blueprint.durationDays,
      },
    });

    return NextResponse.json({
      ok: true,
      campaignId: record.id,
      status: "queued",
      enrollment,
      message:
        enrollment.enrolled > 0
          ? `Campaign queued for ${enrollment.enrolled} eligible contact${enrollment.enrolled === 1 ? "" : "s"}.`
          : "Campaign queued. Add contacts with valid consent to enroll recipients.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
