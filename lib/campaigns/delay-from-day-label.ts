/** Supports "Day 1", "Day 30", "Day 180" etc. */
export function delayFromDayLabel(dayLabel?: string): number {
  const match = dayLabel?.match(/day\s*(\d+)/i);
  if (!match) return 0;
  const day = Number(match[1]);
  return Number.isNaN(day) ? 0 : Math.max(0, (day - 1) * 24 * 60);
}
