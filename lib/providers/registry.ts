import { mockProvider } from "./mock";
import { resendProvider } from "./resend";
import { slybroadcastProvider } from "./slybroadcast";
import { twilioProvider } from "./twilio";
import type { ProviderAdapter, ProviderChannel, SendRequest, SendResult } from "./types";

const ADAPTERS: ProviderAdapter[] = [
  mockProvider,
  slybroadcastProvider,
  twilioProvider,
  resendProvider,
];

function hasSlybroadcastEnv() {
  return Boolean(
    process.env.SLYBROADCAST_USERNAME &&
      process.env.SLYBROADCAST_PASSWORD &&
      process.env.SLYBROADCAST_CALLER_ID,
  );
}

function hasTwilioEnv() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

function hasResendEnv() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}

export function listAdapters() {
  return ADAPTERS.map((a) => ({
    id: a.id,
    label: a.label,
    channels: a.channels,
    configured:
      a.id === "mock"
        ? true
        : a.id === "slybroadcast"
          ? hasSlybroadcastEnv()
          : a.id === "twilio"
            ? hasTwilioEnv()
            : a.id === "resend"
              ? hasResendEnv()
              : false,
  }));
}

export function getAdapter(id: string | undefined): ProviderAdapter {
  if (!id || id === "mock") return mockProvider;
  return ADAPTERS.find((a) => a.id === id) ?? mockProvider;
}

/**
 * Picks a live provider when credentials exist; otherwise falls back to mock.
 * Explicit preferred="mock" always wins (used by Run test sequence).
 */
export function pickAdapterForChannel(
  channel: ProviderChannel,
  preferred?: string,
): ProviderAdapter {
  if (preferred === "mock") return mockProvider;

  if (channel === "email") {
    if (hasResendEnv()) return resendProvider;
    return mockProvider;
  }

  if (channel === "sms") {
    if (preferred === "twilio" && hasTwilioEnv()) return twilioProvider;
    if (hasTwilioEnv()) return twilioProvider;
    return mockProvider;
  }

  if (channel === "voicemail") {
    const id = preferred ?? process.env.VOICE_PROVIDER ?? "slybroadcast";
    if (id === "mock") return mockProvider;
    if (id === "slybroadcast" && hasSlybroadcastEnv()) return slybroadcastProvider;
    if (id === "twilio" && hasTwilioEnv()) return twilioProvider;
    if (hasSlybroadcastEnv()) return slybroadcastProvider;
    return mockProvider;
  }

  if (channel === "video") return mockProvider;

  return mockProvider;
}

export async function dispatch(request: SendRequest, providerId?: string): Promise<SendResult> {
  const adapter = providerId
    ? getAdapter(providerId)
    : pickAdapterForChannel(request.channel);
  try {
    return await adapter.send(request);
  } catch (err) {
    return {
      ok: false,
      status: "failed",
      error: err instanceof Error ? err.message : "Provider error",
    };
  }
}

export function isLiveProvidersConfigured() {
  return {
    voicemail: hasSlybroadcastEnv(),
    sms: hasTwilioEnv(),
    email: hasResendEnv(),
  };
}
