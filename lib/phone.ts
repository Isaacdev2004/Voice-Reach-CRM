export function digitsOnly(value: string | null | undefined) {
  return String(value || "").replace(/[^0-9]/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  const digits = digitsOnly(value);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value || "";
}

/** E.164-ish URI for tel: links */
export function phoneToTelUri(value: string | null | undefined): string | null {
  const digits = digitsOnly(value);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  return null;
}
