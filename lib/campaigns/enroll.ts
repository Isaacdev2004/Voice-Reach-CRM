import { contactMatchesCategory } from "@/lib/contacts/categories";
import { evaluateEligibility } from "@/lib/compliance";
import { scheduledAtForStep } from "./scheduling";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import { ownedConsentRecords } from "@/lib/contacts/owned-consent";
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
  options?: { contactIds?: string[]; category?: string },
): Promise<EnrollResult> {
  const { data: ownedCampaign, error: campaignError } = await supabaseAdmin
    .from("campaigns")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError || !ownedCampaign) throw Error("Campaign not found.");
  let query = supabaseAdmin
    .from("contacts")
    .select(
      "id, phone, dnc, opt_out_requested, category, type, consent_records(*)",
    )
    .eq("owner_id", ownerId);

  if (options?.contactIds?.length) {
    query = query.in("id", options.contactIds);
  }

  const { data: contacts, error } = await query;
  if (error) throw new Error(error.message);

  const categoryFilter = options?.category?.trim();
  const scopedContacts = categoryFilter
    ? (contacts ?? []).filter((c) => contactMatchesCategory(c, categoryFilter))
    : (contacts ?? []);

  const requested =
    options?.contactIds?.length ??
    (categoryFilter ? scopedContacts.length : null);

  return enrollEligible(ownerId, campaignId, scopedContacts, requested);
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
      owner_id?: string;
      contact_id?: string;
    }>;
  }>,
  requested: number | null,
): Promise<EnrollResult> {
  const eligible = contacts
    .filter(
      (c) =>
        evaluateEligibility({
          ...c,
          consent_records: ownedConsentRecords(
            c.consent_records ?? [],
            ownerId,
            c.id,
          ),
        }).eligible,
    )
    .map((c) => c.id);

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
    .eq("owner_id", ownerId)
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

async function insertStepRunsDeduped(
  ownerId: string,
  campaignId: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) return { scheduled: 0 };

  const recipientIds = [
    ...new Set(rows.map((row) => String(row.recipient_id))),
  ];
  const stepIds = [...new Set(rows.map((row) => String(row.step_id)))];

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("campaign_step_runs")
    .select("recipient_id, step_id")
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId)
    .in("recipient_id", recipientIds)
    .in("step_id", stepIds);
  if (existingError) throw new Error(existingError.message);

  const seen = new Set(
    (existing ?? []).map(
      (row) => `${row.recipient_id as string}:${row.step_id as string}`,
    ),
  );
  const freshRows = rows.filter((row) => {
    const key = `${String(row.recipient_id)}:${String(row.step_id)}`;
    return !seen.has(key);
  });

  if (!freshRows.length) return { scheduled: 0 };

  const { error } = await supabaseAdmin
    .from("campaign_step_runs")
    .insert(freshRows);
  if (error?.code === "23505") return { scheduled: 0 };
  if (error) throw new Error(error.message);

  return { scheduled: freshRows.length };
}

function buildStepRunRows(
  ownerId: string,
  campaignId: string,
  steps: Array<{
    id: string;
    delay_minutes?: number | null;
    time_label?: string | null;
  }>,
  recipients: Array<{ id: string; created_at?: string }>,
  options?: { accelerated?: boolean; timeZone?: string },
) {
  const baseTime = Date.now();
  const rows: Record<string, unknown>[] = [];

  for (const recipient of recipients) {
    for (const [index, step] of steps.entries()) {
      // delay_minutes is offset from enrollment (Day N → (N-1)*24h), not delta from prior step.
      const scheduledMs = options?.accelerated
        ? baseTime - (steps.length - index) * 1_000
        : scheduledAtForStep(
            step,
            recipient.created_at ?? new Date(baseTime),
            options?.timeZone ?? "America/New_York",
          ).getTime();
      rows.push({
        owner_id: ownerId,
        campaign_id: campaignId,
        step_id: step.id,
        recipient_id: recipient.id,
        scheduled_at: new Date(scheduledMs).toISOString(),
        status: "scheduled",
      });
    }
  }

  return rows;
}

/** Schedule step runs only for the given recipient row IDs (skips duplicates). */
export async function scheduleStepRunsForRecipients(
  ownerId: string,
  campaignId: string,
  recipientIds: string[],
  options?: { accelerated?: boolean; timeZone?: string },
) {
  if (!recipientIds.length) return { scheduled: 0 };

  const [stepsResult, recipientsResult] = await Promise.all([
    supabaseAdmin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("step_order", { ascending: true }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, eligibility_status, created_at")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .in("id", recipientIds)
      .eq("eligibility_status", "eligible"),
  ]);

  if (stepsResult.error || recipientsResult.error)
    throw new Error("Unable to verify campaign scheduling data.");
  const steps = stepsResult.data,
    recipients = recipientsResult.data;
  if (!steps?.length || !recipients?.length) return { scheduled: 0 };

  const { profile } = await loadWorkspaceSettings(ownerId);
  const rows = buildStepRunRows(ownerId, campaignId, steps, recipients, {
    ...options,
    timeZone: profile.timezone,
  });
  return insertStepRunsDeduped(ownerId, campaignId, rows);
}

/** Drop pending step runs and rebuild from current steps (used on Launch). */
export async function rebuildScheduledStepRuns(
  ownerId: string,
  campaignId: string,
) {
  return ensureStepRunsForCampaign(ownerId, campaignId);
}

/** Schedule any missing step runs for enrolled recipients (used on explicit launch). */
export async function ensureStepRunsForCampaign(
  ownerId: string,
  campaignId: string,
) {
  const [stepsResult, recipientsResult] = await Promise.all([
    supabaseAdmin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .order("step_order", { ascending: true }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, eligibility_status, created_at")
      .eq("campaign_id", campaignId)
      .eq("owner_id", ownerId)
      .eq("eligibility_status", "eligible"),
  ]);

  if (stepsResult.error || recipientsResult.error)
    throw new Error("Unable to verify campaign scheduling data.");
  const steps = stepsResult.data,
    recipients = recipientsResult.data;
  if (!steps?.length || !recipients?.length) return { scheduled: 0 };

  const { profile } = await loadWorkspaceSettings(ownerId);
  const rows = buildStepRunRows(ownerId, campaignId, steps, recipients, {
    timeZone: profile.timezone,
  });
  return insertStepRunsDeduped(ownerId, campaignId, rows);
}
