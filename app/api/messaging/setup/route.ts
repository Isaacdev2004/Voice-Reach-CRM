import {
  submitRegistration,
  registrationSnapshot,
} from "@/lib/messaging/isv/service";
import { requireUserId } from "@/lib/auth";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { managedSetupAllowed } from "@/lib/messaging/setup-access";
import { MessagingSetupSchema } from "@/lib/messaging/setup-schema";
import {
  readMessagingSetup,
  saveMessagingSetup,
} from "@/lib/messaging/setup-store";
import { readSubscriptionStatus } from "@/lib/billing/read-subscription";
import { senderReadiness } from "@/lib/messaging/managed-policy";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  if (!managedSetupAllowed(owner))
    return apiError("Messaging setup is not available.", { status: 404 });
  try {
    const [saved, subscription] = await Promise.all([
      readMessagingSetup(owner),
      readSubscriptionStatus(owner),
    ]);
    // No provisioning worker or provider review is approved in this phase. Never promote self-attestation to Ready.
    let registration;
    try {
      registration = await registrationSnapshot(owner);
    } catch {
      registration = {
        state: "unavailable",
        label: "Registration status unavailable",
        number: null,
      };
    }
    return apiOk({
      saved,
      registration,
      channels: (["sms", "email", "voicemail"] as const).map((channel) => ({
        channel,
        ...senderReadiness({
          owner,
          channel,
          setupVersion: saved?.version ?? "",
          subscription,
          assignment: null,
          liveApproved: false,
        }),
      })),
      sendingEnabled: false,
      provisioningEnabled: false,
    });
  } catch {
    return apiError(
      "Messaging setup could not be verified. Your saved details remain intact.",
      { status: 503 },
    );
  }
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  if (!managedSetupAllowed(owner))
    return apiError("Messaging setup is not available.", { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return apiError("Use MyARI to update messaging setup.", { status: 403 });
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 14000)
    return apiError("Setup details are too large.", { status: 413 });
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return apiError("Use valid setup details.", { status: 400 });
  }
  const parsed = MessagingSetupSchema.safeParse(value);
  if (!parsed.success)
    return apiError(
      "Check your business details, public HTTPS links and consent description.",
      { status: 400 },
    );
  try {
    const saved = await saveMessagingSetup(owner, parsed.data);
    if (process.env.MANAGED_SMS_REGISTRATION_ENABLED === "true")
      await submitRegistration(owner, saved.setup, saved.version);
    return apiOk({ saved, sendingEnabled: false, provisioningEnabled: false });
  } catch {
    return apiError("Setup could not be saved. Please retry.", { status: 503 });
  }
});
