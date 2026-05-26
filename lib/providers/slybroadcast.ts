import type { ProviderAdapter, SendRequest, SendResult, WebhookEvent } from "./types";

/**
 * Slybroadcast ringless voicemail adapter (template).
 *
 * Real integration steps:
 *   1. set SLYBROADCAST_USERNAME and SLYBROADCAST_PASSWORD in env
 *   2. set SLYBROADCAST_CALLER_ID for outbound from-number
 *   3. supply a publicly accessible signed audio URL in request.audioUrl
 *   4. configure webhook to POST to /api/webhooks/voice with provider=slybroadcast
 */
export const slybroadcastProvider: ProviderAdapter = {
  id: "slybroadcast",
  label: "Slybroadcast",
  channels: ["voicemail"],

  async send(request: SendRequest): Promise<SendResult> {
    if (request.channel !== "voicemail") {
      return { ok: false, status: "failed", error: "Slybroadcast only supports voicemail" };
    }

    const username = process.env.SLYBROADCAST_USERNAME;
    const password = process.env.SLYBROADCAST_PASSWORD;
    const callerId = process.env.SLYBROADCAST_CALLER_ID;

    if (!username || !password || !callerId) {
      return {
        ok: false,
        status: "failed",
        error: "Slybroadcast credentials not configured (SLYBROADCAST_USERNAME/PASSWORD/CALLER_ID).",
      };
    }
    if (!request.audioUrl) {
      return { ok: false, status: "failed", error: "Missing audioUrl for voicemail" };
    }

    const body = new URLSearchParams({
      c_uid: username,
      c_password: password,
      c_phone: request.to,
      c_callerID: callerId,
      c_audio: request.audioUrl,
      c_url: request.audioUrl,
      mobile_only: "1",
      c_record_audio: "0",
      c_extref: `${request.campaignId}:${request.recipientId}`,
    });

    try {
      const res = await fetch("https://www.mobile-sphere.com/gateway/vmb.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const text = await res.text();
      const ok = res.ok && /OK/i.test(text);
      const idMatch = text.match(/sessionid=([\w-]+)/i);
      return {
        ok,
        providerMessageId: idMatch?.[1],
        status: ok ? "queued" : "failed",
        rawResponse: { body: text },
        error: ok ? undefined : text,
      };
    } catch (err) {
      return {
        ok: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Slybroadcast request failed",
      };
    }
  },

  parseWebhook(raw): WebhookEvent | null {
    const extRef = String(raw.extref ?? raw.c_extref ?? "");
    const [campaignId, recipientId] = extRef.includes(":") ? extRef.split(":") : [undefined, undefined];
    const status = String(raw.status ?? "").toLowerCase();
    const eventType: WebhookEvent["eventType"] =
      status === "delivered"
        ? "delivered"
        : status === "listened"
          ? "listened"
          : status === "failed"
            ? "failed"
            : status === "callback"
              ? "callback"
              : "unknown";
    return {
      provider: "slybroadcast",
      externalId: String(raw.sessionid ?? raw.id ?? ""),
      eventType,
      campaignId,
      recipientId,
      occurredAt: new Date().toISOString(),
      raw,
    };
  },
};
