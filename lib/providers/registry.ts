import { approvedTransportIssues } from "./assistant-message";
import { renderMessage } from "@/lib/campaigns/render-message";
import {
  evidenceEnabled,
  beginMessage,
  finishMessage,
} from "@/lib/delivery/store";
import { authorizeLiveOutbound } from "./send-authorization";
import { mockProvider } from "./mock";
import { resendProvider } from "./resend";
import { slybroadcastProvider } from "./slybroadcast";
import { twilioProvider } from "./twilio";
import type {
  ProviderAdapter,
  ProviderChannel,
  SendRequest,
  SendResult,
} from "./types";

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
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim(),
  );
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
    if (id === "slybroadcast" && hasSlybroadcastEnv())
      return slybroadcastProvider;
    if (id === "twilio" && hasTwilioEnv()) return twilioProvider;
    if (hasSlybroadcastEnv()) return slybroadcastProvider;
    return mockProvider;
  }

  if (channel === "video") return mockProvider;

  return mockProvider;
}

export async function dispatch(
  request: SendRequest,
  providerId?: string,
): Promise<SendResult> {
  const adapter = providerId
    ? getAdapter(providerId)
    : pickAdapterForChannel(request.channel);
  if (providerId && providerId !== "mock" && adapter.id === "mock")
    return {
      ok: false,
      status: "blocked",
      error: "The requested delivery provider is not configured.",
    };
  if (
    (adapter.id === "mock" && providerId !== "mock") ||
    (adapter.id !== "mock" &&
      !listAdapters().find((a) => a.id === adapter.id)?.configured)
  )
    return {
      ok: false,
      status: "blocked",
      error: "A live delivery provider is not configured for this channel.",
    };
  const approvalIssues = approvedTransportIssues(request, adapter.id);
  if (approvalIssues.length)
    return { ok: false, status: "blocked", error: approvalIssues.join(" ") };
  if (!adapter.channels.includes(request.channel))
    return {
      ok: false,
      status: "blocked",
      error: "This provider does not support the selected channel.",
    };
  if (
    adapter.id !== "mock" &&
    (request.channel === "email" || request.channel === "sms")
  ) {
    const rendered = renderMessage(
      request.channel,
      request.body,
      request.subject,
      undefined,
      { literal: !!request.approvedMessage },
    );
    if (!rendered.ok)
      return {
        ok: false,
        status: "blocked",
        error: "Review the message body and subject before sending.",
      };
    request = {
      ...request,
      body: rendered.body,
      subject: rendered.subject ?? undefined,
    };
  }
  if (adapter.id !== "mock") {
    const issues = await authorizeLiveOutbound(request);
    if (issues.length)
      return { ok: false, status: "blocked", error: issues.join(" ") };
  }
  let evidenceId: string | null = null;
  if (adapter.id !== "mock" && evidenceEnabled()) {
    try {
      evidenceId = await beginMessage(request, adapter.id);
    } catch {
      return {
        ok: false,
        status: "blocked",
        error: "Delivery evidence is unavailable. No message was submitted.",
      };
    }
  }
  try {
    if (request.approvedMessage) {
      const finalIssues = await authorizeLiveOutbound(request);
      if (finalIssues.length) {
        const blocked: SendResult = {
          ok: false,
          status: "blocked",
          error: finalIssues.join(" "),
        };
        if (evidenceId)
          await finishMessage(evidenceId, request, adapter.id, blocked);
        return blocked;
      }
    }
    const result = await adapter.send(request);
    if (evidenceId) {
      try {
        await finishMessage(evidenceId, request, adapter.id, result);
      } catch {
        return {
          ...result,
          uncertain: true,
          rawResponse: undefined,
          error:
            "Submission may have occurred. Reconcile provider records before any retry.",
        };
      }
    }
    return {
      ...result,
      rawResponse: undefined,
      error: result.ok
        ? undefined
        : "The provider could not confirm this submission. Review delivery evidence before retrying.",
    };
  } catch {
    if (evidenceId)
      await finishMessage(evidenceId, request, adapter.id, {
        ok: false,
        status: "failed",
      }).catch(() => undefined);
    return {
      ok: false,
      status: "failed",
      error:
        "The provider submission outcome is unknown. Reconcile before retrying.",
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
