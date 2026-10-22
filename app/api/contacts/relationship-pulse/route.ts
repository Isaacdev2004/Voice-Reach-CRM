import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { buildRelationshipPulse } from "@/lib/contacts/relationship-pulse";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const since = new Date();
  since.setDate(since.getDate() - 45);

  const [contactsRes, tasksRes, engagementRes] = await Promise.all([
    supabaseAdmin
      .from("contacts")
      .select("id, first_name, last_name, type, dnc, budget, created_at, updated_at, consent_records(status)")
      .eq("owner_id", ownerId)
      .limit(2000),
    supabaseAdmin
      .from("contact_tasks")
      .select("contact_id, due_at, completed")
      .eq("owner_id", ownerId)
      .eq("completed", false)
      .limit(500),
    supabaseAdmin
      .from("engagement_events")
      .select("contact_id, event_type, occurred_at, score")
      .eq("owner_id", ownerId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(3000),
  ]);

  if (contactsRes.error) throw new Error(contactsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (engagementRes.error) throw new Error(engagementRes.error.message);

  const contacts = (contactsRes.data ?? []).map((c) => {
    const rec = Array.isArray(c.consent_records)
      ? c.consent_records[0]
      : c.consent_records;
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      type: c.type,
      dnc: c.dnc,
      budget: c.budget,
      created_at: c.created_at,
      updated_at: c.updated_at,
      consent_status: rec?.status ?? null,
    };
  });

  const pulse = buildRelationshipPulse({
    contacts,
    tasks: tasksRes.data ?? [],
    engagement: engagementRes.data ?? [],
  });

  return apiOk(pulse);
});
