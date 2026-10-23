import type { ScheduleItem } from "./model";
export function escapeIcal(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
function fold(line: string) {
  const out: string[] = [];
  let current = "",
    size = 0;
  for (const c of line) {
    const n = Buffer.byteLength(c, "utf8");
    if (size + n > 73) {
      out.push(current);
      current = " ";
      size = 1;
    }
    current += c;
    size += n;
  }
  out.push(current);
  return out.join("\r\n");
}
export function calendarIcal(items: ScheduleItem[], now = new Date()) {
  const instant = (v: string) =>
    new Date(v)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MyARI//Private Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      ...items
        .filter((i) => i.source !== "google" && i.source !== "task")
        .flatMap((i) => [
          "BEGIN:VEVENT",
          `UID:${escapeIcal(i.id)}@myari`,
          `DTSTAMP:${instant(now.toISOString())}`,
          i.allDay && i.startDate
            ? `DTSTART;VALUE=DATE:${i.startDate.replace(/-/g, "")}`
            : `DTSTART:${instant(i.starts_at)}`,
          i.allDay && i.endDate
            ? `DTEND;VALUE=DATE:${i.endDate.replace(/-/g, "")}`
            : `DTEND:${instant(i.ends_at)}`,
          "SUMMARY:Busy",
          "CLASS:PRIVATE",
          "END:VEVENT",
        ]),
      "END:VCALENDAR",
    ]
      .map(fold)
      .join("\r\n") + "\r\n"
  );
}
