export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function last10Digits(phone: string): string {
  const d = phoneDigits(phone);
  return d.slice(-10);
}

/** SQL ILIKE pattern for Supabase: match numbers ending in the same 10 digits. */
export function phoneLast10IlikePattern(phone: string): string | null {
  const last10 = last10Digits(phone);
  if (last10.length < 10) return null;
  return `%${last10}`;
}
