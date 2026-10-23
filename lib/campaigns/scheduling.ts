/** Calendar-day scheduling in the subscriber's IANA zone; offsets remain enrollment-relative. */
function localParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    y: +parts.year,
    m: +parts.month,
    d: +parts.day,
    h: +parts.hour,
    min: +parts.minute,
  };
}
export function scheduledAtForStep(
  step: { delay_minutes?: number | null; time_label?: string | null },
  anchor: string | Date,
  timeZone: string,
): Date {
  const base = new Date(anchor).getTime(),
    delay = step.delay_minutes ?? 0;
  if (!Number.isFinite(base) || !Number.isInteger(delay) || delay < 0)
    throw Error("Review the enrollment date and step delay.");
  const label = step.time_label?.trim() ?? "";
  const immediate = label.match(/^Immediate(?:\s*\+\s*(\d+)m)?$/i);
  if (immediate)
    return new Date(base + (delay + Number(immediate[1] ?? 0)) * 60000);
  if (!label || /^Same day$/i.test(label) || delay % 1440 !== 0)
    return new Date(base + delay * 60000);
  const clock = label.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!clock) throw Error("Choose a supported send time.");
  let hour = Number(clock[1]);
  const minute = Number(clock[2]);
  if (minute > 59 || hour > (clock[3] ? 12 : 23) || (clock[3] && hour < 1))
    throw Error("Choose a valid send time.");
  if (clock[3]) hour = (hour % 12) + (/PM/i.test(clock[3]) ? 12 : 0);
  const date = localParts(new Date(base), timeZone);
  const target = Date.UTC(
    date.y,
    date.m - 1,
    date.d + delay / 1440,
    hour,
    minute,
  );
  let guess = target;
  const seen: number[] = [];
  for (let i = 0; i < 5; i++) {
    const p = localParts(new Date(guess), timeZone);
    const delta = target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
    if (delta === 0) return new Date(Math.max(base, guess));
    seen.push(guess);
    guess += delta;
  }
  // Nonexistent spring-forward clock times shift forward across the gap.
  return new Date(Math.max(base, ...seen.slice(-2), guess));
}
