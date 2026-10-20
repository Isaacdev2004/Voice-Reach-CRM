import { last10Digits, phoneDigits } from "@/lib/contacts/phone-match";

/** Reject inbound events not addressed to our configured Twilio number (when set). */
export function isInboundSmsForConfiguredNumber(toRaw: string): boolean {
  const configured = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!configured) return true;

  const to10 = last10Digits(toRaw);
  const cfg10 = last10Digits(configured);
  if (to10.length >= 10 && cfg10.length >= 10) {
    return to10 === cfg10;
  }

  return phoneDigits(toRaw) === phoneDigits(configured);
}
