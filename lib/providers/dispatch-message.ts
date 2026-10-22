import {
  isLiveOutboundAllowed,
  liveOutboundBlockedMessage,
} from "@/lib/billing/live-outbound";
import {
  normalizeOutboundContent,
  shouldBlockRawJsonSend,
} from "@/lib/campaigns/outbound-content";
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
    const email = contact.email?.trim();
    if (!email || !email.includes("@")) {
      return { address: null, error: "Contact has no email address" };
    }
    return { address: email };
  }
  const phone = contact.phone?.trim();
  if (!phone) {
    return { address: null, error: "Contact has no phone number" };
  }
  return { address: phone };
}

export async function sendToContact(params: {
  ownerId: string;
  contact: ContactForSend;
  channel: ProviderChannel;
  campaignId: string;
  recipientId: string;
  body?: string;
  subject?: string;
  audioUrl?: string;
  mediaUrls?: string[];
  emailAttachments?: EmailAttachmentPayload[];
  providerId?: string;
  stepId?: string;
  recordEngagement?: boolean;
}): Promise<SendResult & { skipped?: boolean; skipReason?: string }> {
  const { address, error: addressError } = resolveRecipientAddress(params.channel, params.contact);
  if (!address) {
    return { ok: false, status: "failed", error: addressError, skipped: true, skipReason: addressError };
  }

  let outboundBody = params.body;
  let outboundSubject = params.subject;
  const outboundChannel =
    params.channel === "email" || params.channel === "sms" || params.channel === "voicemail"
      ? params.channel
      : "sms";
  const rawCopy = (params.body ?? "").trim();
  const subjectCopy = (params.subject ?? "").trim();
  const hasTextCopy = Boolean(rawCopy || (outboundChannel === "email" && subjectCopy));

  if (hasTextCopy) {
    const normalized = normalizeOutboundContent(
      outboundChannel,
      rawCopy || subjectCopy,
      subjectCopy,
    );
    outboundBody = normalized.body || params.body;
    outboundSubject =
      outboundChannel === "email" ? normalized.subject ?? params.subject : params.subject;

    if (
      shouldBlockRawJsonSend(
        outboundBody ?? "",
        outboundChannel === "email" ? outboundSubject : null,
      )
    ) {
      return {
        ok: false,
        status: "failed",
        error:
          "Message content looks like raw AI/JSON. Use plain email or SMS copy before sending.",
        skipped: true,
        skipReason: "raw_ai_json",
      };
    }
  }

  const request: SendRequest = {
    channel: params.channel,
    to: address,
    from:
      params.channel === "sms"
        ? process.env.TWILIO_FROM_NUMBER
        : params.channel === "voicemail"
          ? process.env.SLYBROADCAST_CALLER_ID ?? process.env.VOICE_PROVIDER_FROM_NUMBER
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

  if (result.ok && params.recordEngagement !== false) {
    await recordEngagementEvent({
      ownerId: params.ownerId,
      contactId: params.contact.id,
      campaignId: params.campaignId.startsWith("automation") ? undefined : params.campaignId,
      stepId: params.stepId,
      eventType: "delivered",
      channel: params.channel,
      metadata: {
        provider: providerId,
        providerMessageId: result.providerMessageId,
      },
    }).catch(() => undefined);
  } else if (!result.ok && params.recordEngagement !== false) {
    await recordEngagementEvent({
      ownerId: params.ownerId,
      contactId: params.contact.id,
      campaignId: params.campaignId.startsWith("automation") ? undefined : params.campaignId,
      stepId: params.stepId,
      eventType: "failed",
      channel: params.channel,
      metadata: { error: result.error, provider: providerId },
    }).catch(() => undefined);
  }

  return result;
}
