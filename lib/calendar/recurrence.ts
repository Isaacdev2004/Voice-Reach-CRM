import type { Recurrence } from "./google";

const MAX_OCCURRENCES = 60;

/** Expand a recurring event into local instances (used when Google Calendar is not connected). */
export function expandRecurrenceOccurrences(options: {
  start: Date;
  end: Date;
  recurrence: Recurrence;
  horizonDays?: number;
}): { start: Date; end: Date }[] {
  const { start, end, recurrence } = options;
  const durationMs = end.getTime() - start.getTime();

  if (recurrence === "none") {
    return [{ start: new Date(start), end: new Date(end) }];
  }

  const horizonMs = (options.horizonDays ?? 365) * 24 * 60 * 60 * 1000;
  const until = start.getTime() + horizonMs;
  const occurrences: { start: Date; end: Date }[] = [];
  let cursor = new Date(start);

  while (occurrences.length < MAX_OCCURRENCES && cursor.getTime() <= until) {
    occurrences.push({
      start: new Date(cursor),
      end: new Date(cursor.getTime() + durationMs),
    });

    const next = new Date(cursor);
    if (recurrence === "daily") {
      next.setDate(next.getDate() + 1);
    } else if (recurrence === "weekly") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    cursor = next;
  }

  return occurrences;
}
