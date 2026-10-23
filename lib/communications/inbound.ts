export function normalizeE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15)
    return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
export function classifyReply(body: string): string {
  const text = body.trim();
  if (/^(STOP|STOPALL|UNSUBSCRIBE|CANCEL|END|QUIT)\b/i.test(text))
    return "Opt-out";
  if (/\b(not interested|no thanks|do not contact)\b/i.test(text))
    return "Not interested";
  if (/\b(appointment|schedule|showing|meet|tour)\b/i.test(text))
    return "Appointment request";
  if (text.includes("?")) return "Question";
  if (/\b(interested|yes please|send me|tell me more)\b/i.test(text))
    return "Interested";
  return "Needs review";
}
export function uniqueContactMatch<T extends { phone: string | null }>(
  rows: T[],
  from: string,
): T | null {
  const normalized = normalizeE164(from);
  const matches = rows.filter(
    (r) => normalized && normalizeE164(r.phone ?? "") === normalized,
  );
  return matches.length === 1 ? matches[0] : null;
}
