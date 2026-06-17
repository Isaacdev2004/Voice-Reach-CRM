import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { getGoogleConnection } from "@/lib/calendar/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const connection = await getGoogleConnection(ownerId).catch(() => null);

  const [eventsRes, tasksRes] = await Promise.all([
    supabaseAdmin
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, contact_id, metadata, contacts(first_name, last_name)")
      .eq("owner_id", ownerId)
      .gte("starts_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .limit(100),
    supabaseAdmin
      .from("contact_tasks")
      .select("id, title, due_at, completed, contact_id, contacts(first_name, last_name)")
      .eq("owner_id", ownerId)
      .eq("completed", false)
      .not("due_at", "is", null)
      .gte("due_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("due_at", { ascending: true })
      .limit(50),
  ]);

  return apiOk({
    connected: Boolean(connection),
    accountEmail: connection?.account_email ?? null,
    events: eventsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    eventsError: eventsRes.error?.message ?? null,
    tasksError: tasksRes.error?.message ?? null,
  });
});
