import { resolveShareLink } from "@/lib/calendar/links";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { calendarIcal } from "@/lib/calendar/ical";
import type { ScheduleItem } from "@/lib/calendar/model";
export async function GET(
  _req: Request,
  ctx: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  try {
    const { token } = await ctx.params;
    const link = await resolveShareLink(token, "feed");
    if (!link)
      return new Response("Subscription unavailable.", { status: 404 });
    const rows = await ownedRows<{
      id: string;
      title: string;
      starts_at: string;
      ends_at: string;
      metadata: Record<string, unknown>;
    }>("calendar_events", "*", link.owner_id);
    const now = Date.now();
    const items: ScheduleItem[] = rows
      .filter(
        (e) =>
          Date.parse(e.ends_at) > now - 30 * 86400000 &&
          Date.parse(e.starts_at) < now + 366 * 86400000,
      )
      .map((e) => ({
        id: e.id,
        title: "Busy",
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        source: "crm",
        calendarKey: "crm",
        allDay: e.metadata.allDay === true,
        startDate: e.metadata.startDate as string | undefined,
        endDate: e.metadata.endDate as string | undefined,
      }));
    return new Response(calendarIcal(items), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Subscription temporarily unavailable.", {
      status: 503,
    });
  }
}
