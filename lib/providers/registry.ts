import { mockProvider } from "./mock";
import { slybroadcastProvider } from "./slybroadcast";
import { twilioProvider } from "./twilio";
import type { ProviderAdapter, ProviderChannel, SendRequest, SendResult } from "./types";

const ADAPTERS: ProviderAdapter[] = [mockProvider, slybroadcastProvider, twilioProvider];

export function listAdapters() {
  return ADAPTERS.map((a) => ({ id: a.id, label: a.label, channels: a.channels }));
}

export function getAdapter(id: string | undefined): ProviderAdapter {
  if (!id) return mockProvider;
  return ADAPTERS.find((a) => a.id === id) ?? mockProvider;
}

export function pickAdapterForChannel(
  channel: ProviderChannel,
  preferred?: string,
): ProviderAdapter {
  if (preferred) {
    const candidate = ADAPTERS.find((a) => a.id === preferred && a.channels.includes(channel));
    if (candidate) return candidate;
  }
  const fallback =
    ADAPTERS.find((a) => a.id !== "mock" && a.channels.includes(channel)) ?? mockProvider;
  return fallback;
}

export async function dispatch(request: SendRequest, providerId?: string): Promise<SendResult> {
  const adapter = pickAdapterForChannel(request.channel, providerId);
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
