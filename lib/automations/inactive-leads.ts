import { evaluateTriggers } from "@/lib/automations/engine";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Finds contacts with no recent contact / engagement and fires lead_inactive rules.
 * Skips DNC and opt_out_requested contacts when the column exists.
 */
export async function runInactiveLeadScan(options: { ownerId?: string; limit?: number } = {}) {
  const limit = options.limit ?? 50;
  let query = supabaseAdmin
    .from("automation_rules")
    .select("id, owner_id, trigger_config")
    .eq("trigger_type", "lead_inactive")
    .eq("enabled", true);

  if (options.ownerId) query = query.eq("owner_id", options.ownerId);

  const { data: rules, error } = await query;
  if (error) throw new Error(error.message);
  if (!rules?.length) return { scanned: 0, triggered: 0 };

  const ownerDays = new Map<string, number>();
  for (const rule of rules) {
    const days = Number((rule.trigger_config as { daysInactive?: number } | null)?.daysInactive ?? 14);
    const existing = ownerDays.get(rule.owner_id);
    ownerDays.set(rule.owner_id, existing == null ? days : Math.min(existing, days));
  }

  let triggered = 0;
  let scanned = 0;

  for (const [ownerId, days] of ownerDays) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("contacts")
      .select("id, last_contacted, last_engagement_at, created_at, dnc, opt_out_requested, sequence_active")
      .eq("owner_id", ownerId)
      .eq("dnc", false)
      .limit(limit);

    // If lead-engagement columns aren't migrated yet, fall back to core fields.
    const contactRows =
      contacts ??
      (
        contactsError
          ? (
              await supabaseAdmin
                .from("contacts")
                .select("id, last_contacted, created_at, dnc")
                .eq("owner_id", ownerId)
                .eq("dnc", false)
                .limit(limit)
            ).data
          : null
      ) ??
      [];

    for (const contact of contactRows) {
      scanned += 1;
      if (contact.opt_out_requested) continue;
      if (contact.sequence_active) continue;

      const lastRaw =
        contact.last_engagement_at || contact.last_contacted || contact.created_at || "";
      const last = lastRaw.toString();
      if (last && new Date(last).getTime() > new Date(cutoff).getTime()) continue;

      const { data: recentRun } = await supabaseAdmin
        .from("automation_runs")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("contact_id", contact.id)
        .gte("created_at", cutoff)
        .limit(1)
        .maybeSingle();
      if (recentRun) continue;

      const results = await evaluateTriggers({
        ownerId,
        contactId: contact.id,
        event: "lead_inactive",
        metadata: { daysInactive: days, lastActivity: last.slice(0, 10) },
      });
      if (results.length) triggered += 1;
    }
  }

  return { scanned, triggered };
}

/**
 * Fires engagement_score rules for contacts who crossed the threshold and have no tours.
 */
export async function runEngagementScoreScan(options: { ownerId?: string; limit?: number } = {}) {
  const limit = options.limit ?? 50;
  let query = supabaseAdmin
    .from("automation_rules")
    .select("id, owner_id, trigger_config")
    .eq("trigger_type", "engagement_score")
    .eq("enabled", true);

  if (options.ownerId) query = query.eq("owner_id", options.ownerId);

  const { data: rules, error } = await query;
  if (error) throw new Error(error.message);
  if (!rules?.length) return { scanned: 0, triggered: 0 };

  let triggered = 0;
  let scanned = 0;

  for (const rule of rules) {
    const minScore = Number(
      (rule.trigger_config as { minScore?: number } | null)?.minScore ?? 5,
    );
    const requireNoTours = Boolean(
      (rule.trigger_config as { requireNoTours?: boolean } | null)?.requireNoTours ?? true,
    );

    let contactsQuery = supabaseAdmin
      .from("contacts")
      .select("id, engagement_score, tour_count, dnc, opt_out_requested, sequence_active")
      .eq("owner_id", rule.owner_id)
      .eq("dnc", false)
      .gte("engagement_score", minScore)
      .limit(limit);

    if (requireNoTours) contactsQuery = contactsQuery.eq("tour_count", 0);

    const { data: contacts } = await contactsQuery;

    for (const contact of contacts ?? []) {
      scanned += 1;
      if (contact.opt_out_requested || contact.sequence_active) continue;

      const { data: recentRun } = await supabaseAdmin
        .from("automation_runs")
        .select("id")
        .eq("rule_id", rule.id)
        .eq("contact_id", contact.id)
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (recentRun) continue;

      const results = await evaluateTriggers({
        ownerId: rule.owner_id,
        contactId: contact.id,
        event: "engagement_score",
        metadata: { score: contact.engagement_score, minScore },
      });
      if (results.length) triggered += 1;
    }
  }

  return { scanned, triggered };
}
