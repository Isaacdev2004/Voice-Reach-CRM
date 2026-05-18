export function digitsOnly(value: string | null | undefined) {
  return String(value || "").replace(/[^0-9]/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  const digits = digitsOnly(value);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value || "";
}
