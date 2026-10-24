import { approvedTransportIssues } from "./assistant-message";
import { configuredEmailFrom } from "./assistant-message";
import type {
  ProviderAdapter,
  SendRequest,
  SendResult,
  WebhookEvent,
} from "./types";

/**
 * Resend email adapter.
 * Required: RESEND_API_KEY, RESEND_FROM_EMAIL (must use a verified domain address).
 */
export const resendProvider: ProviderAdapter = {
  id: "resend",
  label: "Resend",
  channels: ["email"],

  async send(request: SendRequest): Promise<SendResult> {
    const approvalIssues = approvedTransportIssues(request, "resend");
    if (approvalIssues.length)
      return { ok: false, status: "blocked", error: approvalIssues.join(" ") };
    if (request.channel !== "email") {
      return {
        ok: false,
        status: "failed",
        error: "Resend only supports email",
      };
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = configuredEmailFrom();

    if (!apiKey) {
      return {
        ok: false,
        status: "failed",
        error: "RESEND_API_KEY is not configured.",
      };
    }
    if (!from) {
      return {
        ok: false,
        status: "failed",
        error:
          "RESEND_FROM_EMAIL is not configured (use an address on your verified domain).",
      };
    }
    if (!request.to?.includes("@")) {
      return {
        ok: false,
        status: "failed",
        error: "Contact has no valid email address.",
      };
    }

    const textBody = request.body ?? "";
    const escape = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const htmlBody = textBody
      .split("\n")
      .map((line) => (line.trim() ? `<p>${escape(line)}</p>` : "<br/>"))
      .join("");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(request.idempotencyKey
            ? { "Idempotency-Key": request.idempotencyKey }
            : {}),
        },
        body: JSON.stringify({
          from,
          to: [request.to],
          subject: request.subject ?? "Message from ARI",
          html: htmlBody,
          text: textBody,
          attachments: (request.emailAttachments ?? []).map((file) => ({
            filename: file.filename,
            content: file.content,
          })),
          tags: [
            { name: "campaign_id", value: request.campaignId.slice(0, 40) },
            { name: "recipient_id", value: request.recipientId.slice(0, 40) },
          ],
        }),
      });

      const raw = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
      };

      return {
        ok: res.ok && typeof raw.id === "string" && !!raw.id.trim(),
        uncertain: res.ok && !(typeof raw.id === "string" && !!raw.id.trim()),
        providerMessageId:
          typeof raw.id === "string" ? raw.id.trim() : undefined,
        status: res.ok ? "sent" : "failed",
        rawResponse: raw,
        error: res.ok
          ? undefined
          : (raw.message ?? `Resend error (${res.status})`),
      };
    } catch (err) {
      return {
        ok: false,
        status: "failed",
        error: err instanceof Error ? err.message : "Resend request failed",
      };
    }
  },

  parseWebhook(raw): WebhookEvent | null {
    const type = String(raw.type ?? "").toLowerCase();
    const data = (raw.data ?? raw) as Record<string, unknown>;
    const tags =
      (data.tags as { name: string; value: string }[] | undefined) ?? [];
    const campaignTag = tags.find((t) => t.name === "campaign_id");
    const recipientTag = tags.find((t) => t.name === "recipient_id");

    const eventType: WebhookEvent["eventType"] = type.includes("delivered")
      ? "delivered"
      : type.includes("opened")
        ? "opened"
        : type.includes("clicked")
          ? "clicked"
          : type.includes("bounced") || type.includes("failed")
            ? "failed"
            : type.includes("complained")
              ? "opt_out"
              : "unknown";

    return {
      provider: "resend",
      externalId: String(data.email_id ?? data.id ?? ""),
      eventType,
      campaignId: campaignTag?.value,
      recipientId: recipientTag?.value,
      occurredAt: new Date().toISOString(),
      raw,
    };
  },
};
