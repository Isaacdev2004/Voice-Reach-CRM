type SendVoicemailParams = {
  to: string;
  from: string;
  audioUrl: string;
  campaignId: string;
  recipientId: string;
};

type ProviderResult = {
  ok: boolean;
  providerMessageId?: string;
  status: string;
  raw?: unknown;
};

export async function sendVoicemail(params: SendVoicemailParams): Promise<ProviderResult> {
  const provider = process.env.VOICE_PROVIDER || "mock";

  if (provider === "mock") {
    return {
      ok: true,
      providerMessageId: `mock_${params.campaignId}_${params.recipientId}`,
      status: "mock_sent",
      raw: { provider, to: params.to, from: params.from },
    };
  }

  // Replace this with the real provider's API contract.
  // Keep all provider keys server-side. Never call this from the browser.
  const response = await fetch(`${process.env.VOICE_PROVIDER_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.VOICE_PROVIDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.to,
      from: params.from,
      audio_url: params.audioUrl,
      external_campaign_id: params.campaignId,
      external_recipient_id: params.recipientId,
    }),
  });

  const raw = await response.json().catch(() => ({}));

  return {
    ok: response.ok,
    providerMessageId: raw.id || raw.message_id,
    status: response.ok ? "sent" : "failed",
    raw,
  };
}
