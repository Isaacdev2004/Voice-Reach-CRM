import type { ProviderAdapter, SendRequest, SendResult, WebhookEvent } from "./types";

export const mockProvider: ProviderAdapter = {
  id: "mock",
  label: "VoiceReach Mock",
  channels: ["voicemail", "sms", "email", "video"],

  async send(request: SendRequest): Promise<SendResult> {
    return {
      ok: true,
      providerMessageId: `mock_${request.channel}_${request.campaignId}_${request.recipientId}`,
      status: "mock_sent",
      rawResponse: { provider: "mock", channel: request.channel, to: request.to },
    };
  },

  parseWebhook(raw): WebhookEvent | null {
    const eventType = (raw.eventType as WebhookEvent["eventType"]) ?? "unknown";
    return {
      provider: "mock",
      externalId: (raw.externalId as string) ?? undefined,
      eventType,
      campaignId: (raw.campaignId as string) ?? undefined,
      recipientId: (raw.recipientId as string) ?? undefined,
      occurredAt: new Date().toISOString(),
      raw,
    };
  },
};
