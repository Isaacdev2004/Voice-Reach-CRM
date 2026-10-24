import type { ApprovedMessage } from "./assistant-message";
import {
  isLiveOutboundAllowed,
  liveOutboundBlockedMessage,
} from "@/lib/billing/live-outbound";
import { renderMessage } from "@/lib/campaigns/render-message";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { dispatch, pickAdapterForChannel } from "@/lib/providers/registry";
import type {
  EmailAttachmentPayload,
  ProviderChannel,
  SendRequest,
  SendResult,
} from "@/lib/providers/types";

export type ContactForSend = {
  id: string;
  phone?: string | null;
  email?: string | null;
};

export function resolveRecipientAddress(
  channel: ProviderChannel,
  contact: ContactForSend,
): { address: string | null; error?: string } {
  if (channel === "email") {
    const email = typeof contact.email === "string" ? contact.email.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { address: null, error: "Contact has no email address" };
    }
    return { address: email };
  }
  const phone = typeof contact.phone === "string" ? contact.phone.trim() : "";
  if (
    !/^\+?[\d ().-]{10,25}$/.test(phone) ||
    phone.replace(/\D/g, "").length < 10
  ) {
    return { address: null, error: "Contact has no phone number" };
  }
  return { address: phone };
}

export async function sendToContact(params: {
  ownerId: string;
  approvedMessage?: ApprovedMessage;
  contact: ContactForSend;
  channel: ProviderChannel;
  campaignId: string;
  recipientId: string;
  body?: string;
  subject?: string;
  audioUrl?: string;
  mediaUrls?: string[];
  emailAttachments?: EmailAttachmentPayload[];
  idempotencyKey?: string;
  providerId?: string;
  stepId?: string;
  recordEngagement?: boolean;
}): Promise<SendResult & { skipped?: boolean; skipReason?: string }> {
  const { address, error: addressError } = resolveRecipientAddress(
    params.channel,
    params.contact,
  );
  if (!address) {
    return {
      ok: false,
      status: "failed",
      error: addressError,
      skipped: true,
      skipReason: addressError,
    };
  }

  const rendered = renderMessage(
    params.channel === "email"
      ? "email"
      : params.channel === "voicemail"
        ? "voicemail"
        : "sms",
    params.body ?? "",
    params.subject ?? "",
    undefined,
    { literal: !!params.approvedMessage },
  );
  const audioOnly =
    params.channel === "voicemail" && !!params.audioUrl && !params.body;
  if (!rendered.ok && !audioOnly)
    return {
      ok: false,
      status: "failed",
      skipped: true,
      skipReason: "invalid_message",
      error: "Review the message preview before sending.",
    };
  const outboundBody = rendered.body;
  const outboundSubject = rendered.subject ?? undefined;

  const request: SendRequest = {
    approvedMessage: params.approvedMessage,
    ownerId: params.ownerId,
    contactId: params.contact.id,
    idempotencyKey: params.idempotencyKey,
    channel: params.channel,
    to: address,
    from:
      params.channel === "sms"
        ? process.env.TWILIO_FROM_NUMBER
        : params.channel === "voicemail"
          ? (process.env.SLYBROADCAST_CALLER_ID ??
            process.env.VOICE_PROVIDER_FROM_NUMBER)
          : undefined,
    audioUrl: params.audioUrl,
    body: outboundBody,
    subject: outboundSubject,
    mediaUrls: params.mediaUrls,
    emailAttachments: params.emailAttachments,
    campaignId: params.campaignId,
    recipientId: params.recipientId,
    stepId: params.stepId,
  };

  // Explicit mock always wins. Otherwise pick a configured live adapter (with mock fallback).
  const providerId =
    params.providerId === "mock"
      ? "mock"
      : pickAdapterForChannel(params.channel, params.providerId).id;

  if (params.providerId !== "mock" && providerId === "mock")
    return {
      ok: false,
      status: "blocked",
      skipped: true,
      skipReason: "provider_unavailable",
      error: "A live delivery provider is not configured for this channel.",
    };
  if (providerId !== "mock" && !isLiveOutboundAllowed()) {
    return {
      ok: false,
      status: "failed",
      error: liveOutboundBlockedMessage(),
      skipped: true,
      skipReason: "live_outbound_paused",
    };
  }

  const result = await dispatch(request, providerId);

  // Provider acceptance is not proof of delivery. Only authenticated disposition events record delivery.
  if (!result.ok && params.recordEngagement !== false) {
    await recordEngagementEvent({
      ownerId: params.ownerId,
      contactId: params.contact.id,
      campaignId: params.campaignId.startsWith("automation")
        ? undefined
        : params.campaignId,
      stepId: params.stepId,
      eventType: "failed",
      channel: params.channel,
      metadata: { provider: providerId },
    }).catch(() => undefined);
  }

  return result;
}
