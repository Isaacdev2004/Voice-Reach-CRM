import { prepareSms, finishSms } from "@/lib/messaging/isv/service";
import { authorizeLiveOutbound } from "./send-authorization";
import { approvedTransportIssues } from "./assistant-message";
import type {
  ProviderAdapter,
  SendRequest,
  SendResult,
  WebhookEvent,
} from "./types";

/**
 * Twilio adapter - SMS now, voice/voicemail with TwiML when configured.
 * SMS uses only owner-scoped encrypted ISV credentials and a verified dedicated assignment.
 */
export const twilioProvider: ProviderAdapter = {
  id: "twilio",
  label: "Twilio",
  channels: ["sms", "voicemail"],

  async send(request: SendRequest): Promise<SendResult> {
    const approvalIssues = approvedTransportIssues(request, "twilio");
    if (approvalIssues.length)
      return { ok: false, status: "blocked", error: approvalIssues.join(" ") };
    if (request.channel === "sms") {
      const issues = await authorizeLiveOutbound(request);
      if (issues.length)
        return { ok: false, status: "blocked", error: issues.join(" ") };
      let prepared: Awaited<ReturnType<typeof prepareSms>>;
      try {
        prepared = await prepareSms(request);
      } catch (error) {
        return {
          ok: false,
          status: "blocked",
          error:
            error instanceof Error
              ? error.message
              : "Managed SMS authorization unavailable.",
        };
      }
      const { assignment, token, to, operation } = prepared;
      const sid = assignment.account_sid;
      const auth = Buffer.from(`${sid}:${token}`).toString("base64");
      const params = new URLSearchParams({
        To: to,
        From: assignment.from_number,
        MessagingServiceSid: assignment.messaging_service_sid!,
        Body: request.body ?? "",
      });
      if (
        process.env.DELIVERY_EVIDENCE_ENABLED === "true" &&
        process.env.APP_BASE_URL
      ) {
        params.set(
          "StatusCallback",
          `${process.env.APP_BASE_URL.replace(/\/$/, "")}/api/messaging/isv/delivery`,
        );
      }
      for (const mediaUrl of request.mediaUrls ?? []) {
        params.append("MediaUrl", mediaUrl);
      }
      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          },
        );
        const raw = await res.json().catch(() => ({}));
        const providerMessageId =
          typeof raw?.sid === "string" && /^SM[0-9a-f]{32}$/i.test(raw.sid)
            ? raw.sid
            : undefined;
        // Treat ambiguous outcomes conservatively; no automatic retry of a possible provider submission.
        const state =
          res.ok && providerMessageId
            ? "sent"
            : res.status >= 400 && res.status < 500
              ? "failed"
              : "unknown";
        await finishSms(request.ownerId!, operation, state, providerMessageId);
        return {
          ok: state === "sent",
          uncertain: state === "unknown",
          providerMessageId,
          status: state === "sent" ? "sent" : "failed",
          error:
            state === "sent"
              ? undefined
              : "Managed SMS provider rejected or could not confirm the request. Review delivery evidence before retrying.",
        };
      } catch {
        try {
          await finishSms(request.ownerId!, operation, "unknown");
        } catch {
          /* Remains dispatching, blocking replay. */
        }
        return {
          ok: false,
          uncertain: true,
          status: "failed",
          error:
            "Managed SMS delivery outcome is uncertain. Do not retry automatically.",
        };
      }
    }

    if (request.channel === "voicemail") {
      // Twilio doesn't natively do ringless voicemail - a real prod setup uses
      // <Play> via a TwiML bin. Here we fall back to mock and surface a hint.
      return {
        ok: false,
        status: "failed",
        error:
          "Twilio voicemail requires a TwiML bin + outbound call. Use Slybroadcast/DropCowboy for ringless voicemail.",
      };
    }

    return {
      ok: false,
      status: "failed",
      error: `Twilio: unsupported channel ${request.channel}`,
    };
  },

  parseWebhook(raw): WebhookEvent | null {
    const status = String(
      raw.MessageStatus ?? raw.SmsStatus ?? "",
    ).toLowerCase();
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
