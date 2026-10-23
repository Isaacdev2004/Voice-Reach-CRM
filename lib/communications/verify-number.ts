/** Read-only provider check. Never configures numbers, callbacks or forwarding. */
export async function verifyTwilioBusinessNumber(
  phone: string,
  accountSid: string,
): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim(),
    token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token || sid !== accountSid) return false;
  try {
    const url = new URL(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/IncomingPhoneNumbers.json`,
    );
    url.searchParams.set("PhoneNumber", phone);
    const r = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      },
    });
    if (!r.ok) return false;
    const j = await r.json();
    return (
      Array.isArray(j.incoming_phone_numbers) &&
      j.incoming_phone_numbers.some(
        (n: { phone_number: string; account_sid: string }) =>
          n.phone_number === phone && n.account_sid === sid,
      )
    );
  } catch {
    return false;
  }
}
