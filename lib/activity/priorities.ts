import { ownedRows } from "@/lib/delivery/owned-rows";
import { zonedParts } from "@/lib/calendar/time";
export async function readPriorities(
  owner: string,
  zone: string,
  now = new Date(),
) {
  const [contacts, tasks, events] = await Promise.all([
    ownedRows<{
      id: string;
      first_name: string;
      last_name?: string;
    }>("contacts", "id, first_name, last_name", owner),
    ownedRows<{
      id: string;
      contact_id: string;
      title: string;
      due_at: string | null;
      completed: boolean;
    }>("contact_tasks", "*", owner),
    ownedRows<{
      id: string;
      contact_id: string | null;
      title: string;
      starts_at: string;
      ends_at: string;
      metadata: Record<string, unknown>;
    }>("calendar_events", "*", owner),
  ]);
  const names = new Map(
    contacts.map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" "),
    ]),
  );
  const today = zonedParts(now, zone).date;
  const due = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.due_at &&
        names.has(t.contact_id) &&
        (Date.parse(t.due_at) < +now ||
          zonedParts(t.due_at, zone).date === today),
    )
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!));
  const appointments = events
    .filter(
      (e) =>
        e.contact_id &&
        names.has(e.contact_id) &&
        Date.parse(e.starts_at) >= +now &&
        Date.parse(e.starts_at) < +now + 7 * 86400000,
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const showingReviews = events.filter(
    (e) =>
      e.contact_id &&
      names.has(e.contact_id) &&
      e.metadata?.status === "completed" &&
      e.metadata?.appointmentType === "showing" &&
      Date.parse(e.ends_at) <= +now &&
      Date.parse(e.ends_at) >= +now - 7 * 86400000,
  );
  return {
    items: [
      ...due.map((t) => ({
        id: "task:" + t.id,
        title: t.title,
        contact: names.get(t.contact_id),
        at: t.due_at!,
        status: Date.parse(t.due_at!) < +now ? "Overdue task" : "Due today",
        href: `/dashboard/contacts/${t.contact_id}`,
      })),
      ...appointments.map((e) => ({
        id: "appointment:" + e.id,
        title: e.title,
        contact: names.get(e.contact_id!),
        at: e.starts_at,
        status: "Upcoming appointment",
        href: `/dashboard/contacts/${e.contact_id}`,
      })),
      ...showingReviews.map((e) => ({
        id: "showing-review:" + e.id,
        title: e.title,
        contact: names.get(e.contact_id!),
        at: e.ends_at,
        status: "Review completed showing",
        href: `/dashboard/contacts/${e.contact_id}`,
      })),
    ].slice(0, 10),
    totalDue: due.length,
    totalUpcoming: appointments.length,
  };
}
