export type ProviderChannel = "voicemail" | "sms" | "email" | "video";

export type SendRequest = {
  channel: ProviderChannel;
  to: string;
  from?: string;
  audioUrl?: string;
  body?: string;
  subject?: string;
  campaignId: string;
  recipientId: string;
  stepId?: string;
};

export type SendResult = {
  ok: boolean;
  providerMessageId?: string;
  status: "sent" | "queued" | "mock_sent" | "failed" | "blocked";
  rawResponse?: unknown;
  error?: string;
};

export type WebhookEvent = {
  provider: string;
  externalId?: string;
  eventType:
    | "delivered"
    | "listened"
    | "failed"
    | "opt_out"
    | "callback"
    | "opened"
    | "clicked"
    | "replied"
    | "blocked"
    | "unknown";
  campaignId?: string;
  recipientId?: string;
  occurredAt: string;
  raw: Record<string, unknown>;
};

export interface ProviderAdapter {
  readonly id: string;
  readonly label: string;
  readonly channels: ProviderChannel[];
  send(request: SendRequest): Promise<SendResult>;
  parseWebhook?(raw: Record<string, unknown>, headers?: Record<string, string>): WebhookEvent | null;
}
