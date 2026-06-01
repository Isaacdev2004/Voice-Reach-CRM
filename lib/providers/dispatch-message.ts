import { recordEngagementEvent } from "@/lib/engagement/record";
import { dispatch, pickAdapterForChannel } from "@/lib/providers/registry";
import type { ProviderChannel, SendRequest, SendResult } from "@/lib/providers/types";

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
  providerId?: string;
  stepId?: string;
  recordEngagement?: boolean;
}): Promise<SendResult & { skipped?: boolean; skipReason?: string }> {
  const { address, error: addressError } = resolveRecipientAddress(params.channel, params.contact);
  if (!address) {
    return { ok: false, status: "failed", error: addressError, skipped: true, skipReason: addressError };
  }

  const preferred =
    params.providerId ??
    (params.channel === "voicemail" ? process.env.VOICE_PROVIDER : undefined);

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
    body: params.body,
    subject: params.subject,
    campaignId: params.campaignId,
    recipientId: params.recipientId,
    stepId: params.stepId,
  };

  const adapter = pickAdapterForChannel(params.channel, preferred);
  const result = await dispatch(request, adapter.id);

  if (result.ok && params.recordEngagement !== false) {
    await recordEngagementEvent({
      ownerId: params.ownerId,
      contactId: params.contact.id,
      campaignId: params.campaignId.startsWith("automation") ? undefined : params.campaignId,
      stepId: params.stepId,
      eventType: "delivered",
      channel: params.channel,
      metadata: {
        provider: adapter.id,
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
      metadata: { error: result.error, provider: adapter.id },
    }).catch(() => undefined);
  }

  return result;
}
