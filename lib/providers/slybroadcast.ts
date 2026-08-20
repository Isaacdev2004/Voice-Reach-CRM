import type { ProviderAdapter, SendRequest, SendResult, WebhookEvent } from "./types";

/**
 * Slybroadcast ringless voicemail adapter.
 *
 * Env: SLYBROADCAST_USERNAME, SLYBROADCAST_PASSWORD, SLYBROADCAST_CALLER_ID
 * Audio: publicly reachable signed URL (WAV / Mp3 / M4a), > 5 seconds.
 * Docs: https://www.slybroadcast.com/documentation.php
 */
function audioTypeFromUrl(url: string): "wav" | "mp3" | "m4a" {
  const path = url.split("?")[0]?.toLowerCase() ?? "";
  if (path.endsWith(".wav")) return "wav";
  if (path.endsWith(".m4a") || path.endsWith(".mp4")) return "m4a";
  return "mp3";
}

function digitsOnlyPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Slybroadcast US examples use 10-digit local form; keep last 10 when +1…
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

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

    const to = digitsOnlyPhone(request.to);
    const from = digitsOnlyPhone(callerId);
    if (to.length < 10) {
      return { ok: false, status: "failed", error: "Invalid destination phone for Slybroadcast" };
    }

    const body = new URLSearchParams({
      c_uid: username,
      c_password: password,
      c_phone: to,
      c_callerID: from,
      c_url: request.audioUrl,
      // Required when using c_url: file type, not the URL itself
      c_audio: audioTypeFromUrl(request.audioUrl),
      // Required: "now" or Eastern Time YYYY-MM-DD HH:MM:SS
      c_date: "now",
      c_title: `ARI ${request.campaignId.slice(0, 8)}`,
      mobile_only: "1",
      c_extref: `${request.campaignId}:${request.recipientId}`,
    });

    const dispoUrl =
      process.env.SLYBROADCAST_DISPO_URL?.trim() ||
      (process.env.APP_BASE_URL
        ? `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/webhooks/voice?provider=slybroadcast`
        : undefined);
    if (dispoUrl) body.set("c_dispo_url", dispoUrl);

    try {
      const res = await fetch("https://www.mobile-sphere.com/gateway/vmb.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const text = await res.text();
      const ok = res.ok && /OK|session.?id/i.test(text) && !/ERROR/i.test(text);
      const idMatch = text.match(/session[_ ]?id[=:\s]+([\w-]+)/i);
      return {
        ok,
        providerMessageId: idMatch?.[1],
        status: ok ? "queued" : "failed",
        rawResponse: { body: text },
        error: ok
          ? undefined
          : text.slice(0, 300) || "Slybroadcast rejected the campaign",
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
    const [campaignId, recipientId] = extRef.includes(":")
      ? extRef.split(":")
      : [undefined, undefined];
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
