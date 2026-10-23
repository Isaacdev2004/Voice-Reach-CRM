import type { Recurrence } from "./google";
import {
  zonedParts,
  addCalendarDays,
  wallTimeToInstant,
  validateInterval,
} from "./time";
export function expandRecurrenceOccurrences(options: {
  start: Date;
  end: Date;
  recurrence: Recurrence;
  horizonDays?: number;
  timeZone?: string;
}) {
  validateInterval(options.start.toISOString(), options.end.toISOString());
  const zone = options.timeZone ?? "UTC",
    first = zonedParts(options.start, zone),
    duration = +options.end - +options.start,
    result: {
      start: Date;
      end: Date;
    }[] = [];
  const horizon = +options.start + (options.horizonDays ?? 365) * 86400000;
  for (let i = 0; i < 400 && result.length < 60; i++) {
    let date = first.date;
    if (i) {
      if (options.recurrence === "none") break;
      if (options.recurrence === "monthly") {
        const d = new Date(first.date + "T12:00Z");
        const day = d.getUTCDate();
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + i);
        d.setUTCDate(day);
        if (d.getUTCDate() !== day) continue;
        date = d.toISOString().slice(0, 10);
      } else
        date = addCalendarDays(
          first.date,
          i * (options.recurrence === "weekly" ? 7 : 1),
        );
    }
    let instant: string;
    try {
      instant = i
        ? wallTimeToInstant(date, first.time, zone, "earlier")
        : options.start.toISOString();
    } catch {
      continue;
    }
    const start = new Date(instant);
    if (+start > horizon) break;
    result.push({ start, end: new Date(+start + duration) });
  }
  return result;
}
