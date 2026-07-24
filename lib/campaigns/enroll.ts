import { evaluateEligibility } from "@/lib/compliance";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type EnrollResult = {
  enrolled: number;
  eligible: number;
  total: number;
  requested: number | null;
  recipientIds: string[];
};

/** Write a Yes consent record so a contact can be enrolled for a dry-run / test. */
export async function documentTestConsent(ownerId: string, contactIds: string[]) {
  if (!contactIds.length) return;
  const today = new Date().toISOString().slice(0, 10);
  const rows = contactIds.map((contactId) => ({
    owner_id: ownerId,
    contact_id: contactId,
    status: "Yes",
    consent_date: today,
    source: "Campaign test run",
    proof_reference: "Owner-initiated test enrollment",
    notes: "Auto-documented for campaign sequence testing",
  }));
  const { error } = await supabaseAdmin.from("consent_records").insert(rows);
  if (error) throw new Error(error.message);
}

export async function enrollContacts(
  ownerId: string,
  campaignId: string,
  options?: { contactIds?: string[]; documentTestConsent?: boolean },
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

  if (options?.documentTestConsent && options.contactIds?.length) {
    const needingConsent = (contacts ?? [])
      .filter((c) => !evaluateEligibility(c).eligible)
      .map((c) => c.id as string);
    if (needingConsent.length) {
      await documentTestConsent(ownerId, needingConsent);
      const { data: refreshed, error: refreshError } = await supabaseAdmin
        .from("contacts")
        .select("id, phone, dnc, consent_records(*)")
        .eq("owner_id", ownerId)
        .in("id", options.contactIds);
      if (refreshError) throw new Error(refreshError.message);
      return enrollEligible(ownerId, campaignId, refreshed ?? [], options.contactIds.length);
    }
  }

  return enrollEligible(ownerId, campaignId, contacts ?? [], options?.contactIds?.length ?? null);
}

async function enrollEligible(
  ownerId: string,
  campaignId: string,
  contacts: Array<{
    id: string;
    phone: string;
    dnc: boolean;
    consent_records?: Array<{
      status: string;
      consent_date?: string | null;
      source?: string | null;
      proof_reference?: string | null;
      created_at?: string | null;
    }>;
  }>,
  requested: number | null,
): Promise<EnrollResult> {
  const eligible = contacts.filter((c) => evaluateEligibility(c).eligible).map((c) => c.id);

  if (eligible.length === 0) {
    return {
      enrolled: 0,
      eligible: 0,
      total: contacts.length,
      requested,
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
      total: contacts.length,
      requested,
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
    total: contacts.length,
    requested,
    recipientIds: (inserted ?? []).map((r) => r.id as string),
  };
}

/** Schedule step runs only for the given recipient row IDs (avoids duplicating existing schedules). */
export async function scheduleStepRunsForRecipients(
  ownerId: string,
  campaignId: string,
  recipientIds: string[],
  options?: { accelerated?: boolean },
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
    for (const [index, step] of steps.entries()) {
      if (options?.accelerated) {
        // All due immediately so one scheduler tick can process the full sequence.
        cursor = baseTime - (steps.length - index) * 1_000;
      } else {
        cursor += (step.delay_minutes ?? 0) * 60_000;
      }
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
