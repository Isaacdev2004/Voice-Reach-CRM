import type { ProviderAdapter, SendRequest, SendResult, WebhookEvent } from "./types";

/**
 * Twilio adapter — SMS now, voice/voicemail with TwiML when configured.
 * Required env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 */
export const twilioProvider: ProviderAdapter = {
  id: "twilio",
  label: "Twilio",
  channels: ["sms", "voicemail"],

  async send(request: SendRequest): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = request.from || process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      return {
        ok: false,
        status: "failed",
        error: "Twilio credentials missing (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER).",
      };
    }

    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    if (request.channel === "sms") {
      const body = new URLSearchParams({
        To: request.to,
        From: from,
        Body: request.body ?? "",
      });
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        });
        const raw = await res.json().catch(() => ({}));
        const twilioError =
          typeof raw?.message === "string"
            ? raw.message.includes("not a Twilio phone number") ||
              raw.message.includes("country mismatch")
              ? `${raw.message} Fix: in Vercel set TWILIO_FROM_NUMBER to a number you own in Twilio Console that matches the recipient’s country (US → US Twilio number).`
              : raw.message
            : undefined;
        return {
          ok: res.ok,
          providerMessageId: raw?.sid,
          status: res.ok ? "sent" : "failed",
          rawResponse: raw,
          error: res.ok ? undefined : twilioError,
        };
      } catch (err) {
        return {
          ok: false,
          status: "failed",
          error: err instanceof Error ? err.message : "Twilio SMS failed",
        };
      }
    }

    if (request.channel === "voicemail") {
      // Twilio doesn't natively do ringless voicemail — a real prod setup uses
      // <Play> via a TwiML bin. Here we fall back to mock and surface a hint.
      return {
        ok: false,
        status: "failed",
        error:
          "Twilio voicemail requires a TwiML bin + outbound call. Use Slybroadcast/DropCowboy for ringless voicemail.",
      };
    }

    return { ok: false, status: "failed", error: `Twilio: unsupported channel ${request.channel}` };
  },

  parseWebhook(raw): WebhookEvent | null {
    const status = String(raw.MessageStatus ?? raw.SmsStatus ?? "").toLowerCase();
    const eventType: WebhookEvent["eventType"] =
      status === "delivered"
        ? "delivered"
        : status === "failed" || status === "undelivered"
          ? "failed"
          : "unknown";
    return {
      provider: "twilio",
      externalId: String(raw.MessageSid ?? ""),
      eventType,
      occurredAt: new Date().toISOString(),
      raw,
    };
  },
};
