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
  if (!start || !end) return true;

  const tz = params.timeZone || "America/New_York";
  const now = params.now ?? new Date();
  let z;try{z=zonedParts(now,tz);}catch{return true;}
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
  if(!parseHm(params.quietHoursStart)||!parseHm(params.quietHoursEnd))throw new Error('Review quiet-hours settings.');
  const now=params.now??new Date();
  // Walk real instants, not nominal local minutes: DST nights are not always 24 hours.
  for(let minutes=0;minutes<=49*60;minutes++){
    const candidate=new Date(now.getTime()+minutes*60000);
    if(!isInQuietHours({...params,now:candidate}))return new Date(candidate.getTime()+2*60000);
  }
  throw new Error('Review the sending timezone and quiet-hours settings.');
}
