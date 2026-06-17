import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  fetchGoogleAccountEmail,
  getGoogleConnection,
  getValidGoogleAccessToken,
  listGoogleCalendarEvents,
} from "@/lib/calendar/google";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function asContactJoin(
  value: unknown,
): { first_name: string; last_name?: string | null } | null {
  if (!value || Array.isArray(value)) return null;
  const row = value as { first_name?: string; last_name?: string | null };
  if (!row.first_name) return null;
  return { first_name: row.first_name, last_name: row.last_name ?? null };
}

export type AgendaItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  contact_id?: string | null;
  contacts?: { first_name: string; last_name?: string | null } | null;
  source: "google" | "crm" | "task";
  htmlLink?: string | null;
};

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const connection = await getGoogleConnection(ownerId).catch(() => null);

  const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  let accountEmail = connection?.account_email ?? null;
  let googleEvents: Awaited<ReturnType<typeof listGoogleCalendarEvents>> = [];
  let googleError: string | null = null;

  if (connection) {
    try {
      googleEvents = await listGoogleCalendarEvents({ connection, timeMin, timeMax });

      if (!accountEmail) {
        const token = await getValidGoogleAccessToken(connection);
        const email = await fetchGoogleAccountEmail(token);
        if (email) {
          accountEmail = email;
          await supabaseAdmin
            .from("calendar_connections")
            .update({ account_email: email, updated_at: new Date().toISOString() })
            .eq("id", connection.id);
        }
      }
    } catch (err) {
      googleError = err instanceof Error ? err.message : "Could not load Google Calendar";
    }
  }

  const [eventsRes, tasksRes] = await Promise.all([
    supabaseAdmin
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, contact_id, external_event_id, metadata, contacts(first_name, last_name)")
      .eq("owner_id", ownerId)
      .gte("starts_at", timeMin.toISOString())
      .lte("starts_at", timeMax.toISOString())
      .order("starts_at", { ascending: true })
      .limit(100),
    supabaseAdmin
      .from("contact_tasks")
      .select("id, title, due_at, completed, contact_id, contacts(first_name, last_name)")
      .eq("owner_id", ownerId)
      .eq("completed", false)
      .not("due_at", "is", null)
      .gte("due_at", timeMin.toISOString())
      .lte("due_at", timeMax.toISOString())
      .order("due_at", { ascending: true })
      .limit(50),
  ]);

  const googleIds = new Set(googleEvents.map((e) => e.id));
  const crmEvents: AgendaItem[] = (eventsRes.data ?? [])
    .filter((e) => !e.external_event_id || !googleIds.has(e.external_event_id))
    .map((e) => ({
      id: e.id,
      title: e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      contact_id: e.contact_id,
      contacts: asContactJoin(e.contacts),
      source: "crm" as const,
      htmlLink: (e.metadata as { htmlLink?: string } | null)?.htmlLink ?? null,
    }));

  const googleAgenda: AgendaItem[] = googleEvents.map((e) => ({
    id: `google-${e.id}`,
    title: e.title,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    source: "google" as const,
    htmlLink: e.htmlLink ?? null,
  }));

  const taskAgenda: AgendaItem[] = (tasksRes.data ?? []).map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    starts_at: t.due_at!,
    contact_id: t.contact_id,
    contacts: asContactJoin(t.contacts),
    source: "task" as const,
  }));

  const agenda = [...googleAgenda, ...crmEvents, ...taskAgenda].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  return apiOk({
    connected: Boolean(connection),
    accountEmail,
    agenda,
    counts: {
      google: googleAgenda.length,
      crm: crmEvents.length,
      tasks: taskAgenda.length,
    },
    googleError,
    eventsError: eventsRes.error?.message ?? null,
    tasksError: tasksRes.error?.message ?? null,
  });
});
