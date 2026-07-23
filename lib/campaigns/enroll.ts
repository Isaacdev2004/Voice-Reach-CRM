import { evaluateEligibility } from "@/lib/compliance";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type EnrollResult = {
  enrolled: number;
  eligible: number;
  total: number;
  requested: number | null;
  recipientIds: string[];
};

export async function enrollContacts(
  ownerId: string,
  campaignId: string,
  options?: { contactIds?: string[] },
): Promise<EnrollResult> {
  let query = supabaseAdmin
    .from("contacts")
    .select("id, phone, dnc, consent_records(*)")
    .eq("owner_id", ownerId);

  if (options?.contactIds?.length) {
    query = query.in("id", options.contactIds);
  }

  const { data: contacts, error } = await query;
  if (error) throw new Error(error.message);

  const eligible =
    contacts?.filter((c) => evaluateEligibility(c).eligible).map((c) => c.id) ?? [];

  if (eligible.length === 0) {
    return {
      enrolled: 0,
      eligible: 0,
      total: contacts?.length ?? 0,
      requested: options?.contactIds?.length ?? null,
      recipientIds: [],
    };
  }

  const { data: existing } = await supabaseAdmin
    .from("campaign_recipients")
    .select("contact_id")
    .eq("campaign_id", campaignId)
    .in("contact_id", eligible);

  const already = new Set((existing ?? []).map((r) => r.contact_id as string));
  const newContactIds = eligible.filter((id) => !already.has(id));

  if (newContactIds.length === 0) {
    return {
      enrolled: 0,
      eligible: eligible.length,
      total: contacts?.length ?? 0,
      requested: options?.contactIds?.length ?? null,
      recipientIds: [],
    };
  }

  const rows = newContactIds.map((contactId) => ({
    owner_id: ownerId,
    campaign_id: campaignId,
    contact_id: contactId,
    eligibility_status: "eligible",
    eligibility_issues: [],
    delivery_status: "not_sent",
  }));

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("campaign_recipients")
    .insert(rows)
    .select("id");

  if (insertError) throw new Error(insertError.message);

  return {
    enrolled: inserted?.length ?? newContactIds.length,
    eligible: eligible.length,
    total: contacts?.length ?? 0,
    requested: options?.contactIds?.length ?? null,
    recipientIds: (inserted ?? []).map((r) => r.id as string),
  };
}

/** Schedule step runs only for the given recipient row IDs (avoids duplicating existing schedules). */
export async function scheduleStepRunsForRecipients(
  ownerId: string,
  campaignId: string,
  recipientIds: string[],
) {
  if (!recipientIds.length) return { scheduled: 0 };

  const [{ data: steps }, { data: recipients }] = await Promise.all([
    supabaseAdmin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("step_order", { ascending: true }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, eligibility_status")
      .eq("campaign_id", campaignId)
      .in("id", recipientIds)
      .eq("eligibility_status", "eligible"),
  ]);

  if (!steps?.length || !recipients?.length) return { scheduled: 0 };

  const baseTime = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const recipient of recipients) {
    let cursor = baseTime;
    for (const step of steps) {
      cursor += (step.delay_minutes ?? 0) * 60_000;
      rows.push({
        owner_id: ownerId,
        campaign_id: campaignId,
        step_id: step.id,
        recipient_id: recipient.id,
        scheduled_at: new Date(cursor).toISOString(),
        status: "scheduled",
      });
    }
  }

  if (!rows.length) return { scheduled: 0 };

  const { error } = await supabaseAdmin.from("campaign_step_runs").insert(rows);
  if (error) throw new Error(error.message);

  return { scheduled: rows.length };
}
