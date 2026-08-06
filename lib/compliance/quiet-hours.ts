/**
 * Quiet hours helpers. Quiet window may wrap midnight (e.g. 21:00 → 08:00).
 */

function parseHm(value: string): { h: number; m: number } | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return { h, m };
}

function minutesOfDay(h: number, m: number) {
  return h * 60 + m;
}

function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
  };
}

export function isInQuietHours(params: {
  now?: Date;
  quietHoursStart: string;
  quietHoursEnd: string;
  timeZone?: string;
}): boolean {
  const start = parseHm(params.quietHoursStart);
  const end = parseHm(params.quietHoursEnd);
  if (!start || !end) return false;

  const tz = params.timeZone || "America/New_York";
  const now = params.now ?? new Date();
  const z = zonedParts(now, tz);
  const current = minutesOfDay(z.hour, z.minute);
  const s = minutesOfDay(start.h, start.m);
  const e = minutesOfDay(end.h, end.m);

  if (s === e) return false;
  if (s < e) return current >= s && current < e;
  return current >= s || current < e;
}

/** UTC Date roughly when quiet hours end (defers sends safely past the window). */
export function nextQuietHoursEnd(params: {
  now?: Date;
  quietHoursStart: string;
  quietHoursEnd: string;
  timeZone?: string;
}): Date {
  const end = parseHm(params.quietHoursEnd) ?? { h: 8, m: 0 };
  const start = parseHm(params.quietHoursStart) ?? { h: 21, m: 0 };
  const tz = params.timeZone || "America/New_York";
  const now = params.now ?? new Date();
  const z = zonedParts(now, tz);
  const current = minutesOfDay(z.hour, z.minute);
  const s = minutesOfDay(start.h, start.m);
  const e = minutesOfDay(end.h, end.m);

  let minutesUntilEnd: number;
  if (s < e) {
    // same-day quiet window
    minutesUntilEnd = current < e ? e - current : 24 * 60 - current + e;
  } else {
    // wraps midnight — end is tomorrow morning if we're past start, or later tonight/morning
    if (current >= s) {
      minutesUntilEnd = 24 * 60 - current + e;
    } else if (current < e) {
      minutesUntilEnd = e - current;
    } else {
      minutesUntilEnd = e + (24 * 60 - current);
    }
  }

  // Add a small buffer so we don't immediately re-enter quiet hours due to clock skew
  return new Date(now.getTime() + (minutesUntilEnd + 2) * 60_000);
}
