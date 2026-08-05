import { evaluateTriggers } from "@/lib/automations/engine";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Finds contacts with no recent contact / engagement and fires lead_inactive rules.
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
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, last_contacted, created_at, dnc")
      .eq("owner_id", ownerId)
      .eq("dnc", false)
      .limit(limit);

    for (const contact of contacts ?? []) {
      scanned += 1;
      const last = (contact.last_contacted || contact.created_at || "").toString().slice(0, 10);
      if (last && last > cutoff) continue;

      const { data: recentRun } = await supabaseAdmin
        .from("automation_runs")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("contact_id", contact.id)
        .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (recentRun) continue;

      const results = await evaluateTriggers({
        ownerId,
        contactId: contact.id,
        event: "lead_inactive",
        metadata: { daysInactive: days, lastActivity: last },
      });
      if (results.length) triggered += 1;
    }
  }

  return { scanned, triggered };
}
