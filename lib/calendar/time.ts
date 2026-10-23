const formatters = new Map<string, Intl.DateTimeFormat>();
export function validTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}
export function zonedParts(value: string | Date, zone: string) {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(zone, formatter);
  }
  const p = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    minutes: +p.hour * 60 + +p.minute,
  };
}
export function addCalendarDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function wallTimeToInstant(
  date: string,
  clock: string,
  zone: string,
  fold: "reject" | "earlier" | "later" = "reject",
): string {
  if (
    !validTimeZone(zone) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(clock) ||
    new Date(`${date}T12:00Z`).toISOString().slice(0, 10) !== date
  )
    throw Error("Choose a valid date, time and timezone.");
  const target = Date.parse(`${date}T${clock}:00Z`),
    matches: string[] = [];
  for (let offset = -14 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(target + offset * 60000);
    const p = zonedParts(candidate, zone);
    if (p.date === date && p.time === clock)
      matches.push(candidate.toISOString());
  }
  if (!matches.length)
    throw Error(
      "This time does not exist because the clocks move forward. Choose another time.",
    );
  if (matches.length > 1 && fold === "reject")
    throw Error(
      "This time occurs twice when the clocks move back. Choose the first or second occurrence.",
    );
  return fold === "later" ? matches.at(-1)! : matches[0];
}
export function weekDates(date: string, monday: boolean) {
  const weekday = new Date(`${date}T12:00Z`).getUTCDay();
  const first = addCalendarDays(date, -((weekday + (monday ? 6 : 0)) % 7));
  return Array.from({ length: 7 }, (_, i) => addCalendarDays(first, i));
}
export function monthDates(date: string, monday: boolean) {
  const first = date.slice(0, 7) + "-01";
  const start = weekDates(first, monday)[0];
  return Array.from({ length: 42 }, (_, i) => addCalendarDays(start, i));
}
export function dateLabel(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  },
) {
  return new Date(`${date}T12:00Z`).toLocaleDateString("en-US", {
    ...options,
    timeZone: "UTC",
  });
}
export function formatClock(iso: string, zone: string, hour24: boolean) {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: !hour24,
  });
}
export function validateInterval(start: string, end: string) {
  const duration = Date.parse(end) - Date.parse(start);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 366 * 86400000)
    throw Error("End time must be after start time.");
}

export function navigateCalendarDate(
  date: string,
  view: string,
  delta: number,
) {
  if (view !== "month")
    return addCalendarDays(
      date,
      delta * (view === "week" ? 7 : view === "agenda" ? 30 : 1),
    );
  const d = new Date(date + "T12:00Z"),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + delta);
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function foldForInstant(
  iso: string,
  zone: string,
): "reject" | "earlier" | "later" {
  const p = zonedParts(iso, zone);
  const early = wallTimeToInstant(p.date, p.time, zone, "earlier"),
    late = wallTimeToInstant(p.date, p.time, zone, "later");
  return early === late
    ? "reject"
    : Math.abs(Date.parse(iso) - Date.parse(late)) < 60000
      ? "later"
      : "earlier";
}
export function describeCalendarInstant(
  iso: string,
  zone: string,
  hour24: boolean,
) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: !hour24,
    timeZoneName: "shortOffset",
  });
}

/** Ignore malformed date links rather than breaking the calendar's range request. */
export function initialCalendarDate(
  requested: string | null,
  timezone: string,
) {
  if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) {
    try {
      wallTimeToInstant(requested, "12:00", timezone, "earlier");
      return requested;
    } catch {
      /* Fall back to the actual local date. */
    }
  }
  return zonedParts(new Date(), timezone).date;
}
