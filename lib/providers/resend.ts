import type { ProviderAdapter, SendRequest, SendResult, WebhookEvent } from "./types";

function getFromAddress(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) return null;
  if (from.includes("<") && from.includes(">")) return from;
  if (from.includes("@")) return `ARI <${from}>`;
  return null;
}

/**
 * Resend email adapter.
 * Required: RESEND_API_KEY, RESEND_FROM_EMAIL (must use a verified domain address).
 */
export const resendProvider: ProviderAdapter = {
  id: "resend",
  label: "Resend",
  channels: ["email"],

  async send(request: SendRequest): Promise<SendResult> {
    if (request.channel !== "email") {
      return { ok: false, status: "failed", error: "Resend only supports email" };
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = getFromAddress();

    if (!apiKey) {
      return { ok: false, status: "failed", error: "RESEND_API_KEY is not configured." };
    }
    if (!from) {
      return {
        ok: false,
        status: "failed",
        error: "RESEND_FROM_EMAIL is not configured (use an address on your verified domain).",
      };
    }
    if (!request.to?.includes("@")) {
      return { ok: false, status: "failed", error: "Contact has no valid email address." };
    }

    const textBody = request.body ?? "";
    const htmlBody = textBody.includes("<")
      ? textBody
      : textBody
          .split("\n")
          .map((line) => (line.trim() ? `<p>${line}</p>` : "<br/>"))
          .join("");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [request.to],
          subject: request.subject ?? "Message from ARI",
          html: htmlBody,
          text: textBody.replace(/<[^>]+>/g, ""),
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
        ok: res.ok,
        providerMessageId: raw.id,
        status: res.ok ? "sent" : "failed",
        rawResponse: raw,
        error: res.ok ? undefined : raw.message ?? `Resend error (${res.status})`,
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
    const tags = (data.tags as { name: string; value: string }[] | undefined) ?? [];
    const campaignTag = tags.find((t) => t.name === "campaign_id");
    const recipientTag = tags.find((t) => t.name === "recipient_id");

    const eventType: WebhookEvent["eventType"] =
      type.includes("delivered")
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
