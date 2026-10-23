import { CalendarPreferencesSchema } from "./preferences";
import { addCalendarDays, wallTimeToInstant, zonedParts } from "./time";
import { conflictsFor } from "./conflicts";
import { readCalendar } from "./read-model";
import { ownedRows } from "@/lib/delivery/owned-rows";
import type { ShareLink } from "./links";
export async function bookingSlots(
  link: ShareLink,
  date: string,
  now = new Date(),
  excludeId?: string,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("INVALID_DATE");
  const p = CalendarPreferencesSchema.parse(
    Object.fromEntries(
      Object.entries(link.config).filter(
        ([k]) => k in CalendarPreferencesSchema.parse({}),
      ),
    ),
  );
  const today = zonedParts(now, p.timezone).date;
  if (date < today || date > addCalendarDays(today, 60))
    throw Error("INVALID_DATE");
  const weekday = new Date(date + "T12:00Z").getUTCDay();
  if (!p.workDays.includes(weekday))
    return {
      slots: [],
      timezone: p.timezone,
      duration: p.duration,
      title: String(link.config.title ?? "Client appointment"),
    };
  const from = wallTimeToInstant(date, "00:00", p.timezone, "earlier"),
    to = wallTimeToInstant(
      addCalendarDays(date, 1),
      "00:00",
      p.timezone,
      "earlier",
    );
  const calendar = await readCalendar(link.owner_id, from, to);
  if (
    calendar.health.some((h) => !!h.error) ||
    (calendar.authorized && !calendar.connected)
  )
    throw Error("EXTERNAL_UNVERIFIED");
  const pending = await ownedRows<{
    id: string;
    starts_at: string;
    ends_at: string;
    status: string;
  }>("calendar_booking_requests", "*", link.owner_id);
  const start = +p.workStart.slice(0, 2) * 60 + +p.workStart.slice(3),
    end = +p.workEnd.slice(0, 2) * 60 + +p.workEnd.slice(3);
  const slots: {
    start: string;
    end: string;
  }[] = [];
  for (let min = start; min + p.duration <= end; min += 15) {
    try {
      const at = wallTimeToInstant(
        date,
        `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`,
        p.timezone,
      );
      const finish = new Date(
        Date.parse(at) + p.duration * 60000,
      ).toISOString();
      if (
        Date.parse(at) < +now + p.noticeMinutes * 60000 ||
        zonedParts(finish, p.timezone).date !== date ||
        zonedParts(finish, p.timezone).minutes > end
      )
        continue;
      if (conflictsFor(calendar.agenda, at, finish, p).length) continue;
      if (
        pending.some(
          (r) =>
            r.status === "pending" &&
            r.id !== excludeId &&
            Date.parse(r.starts_at) <
              Date.parse(finish) + (p.bufferAfter + p.travelMinutes) * 60000 &&
            Date.parse(r.ends_at) >
              Date.parse(at) - (p.bufferBefore + p.travelMinutes) * 60000,
        )
      )
        continue;
      slots.push({ start: at, end: finish });
    } catch {
      /* Nonexistent or repeated DST slots are not offered. */
    }
  }
  return {
    slots,
    timezone: p.timezone,
    duration: p.duration,
    title: String(link.config.title ?? "Client appointment"),
  };
}
