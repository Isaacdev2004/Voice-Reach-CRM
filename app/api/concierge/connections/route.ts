import { apiOk } from "@/lib/api-response";
import {
  conciergeHandler,
  ConciergeError,
  jsonBody,
} from "@/lib/concierge/access";
import { GET as verifyExistingSetup } from "@/app/api/settings/onboarding/route";
import { loadCase, mutate } from "@/lib/concierge/store";
import { z } from "zod";
export const POST = conciergeHandler(async (request, owner) => {
  z.object({ confirmed: z.literal(true) })
    .strict()
    .parse(await jsonBody(request));
  const record = await loadCase(owner);
  if (!record) throw new ConciergeError("Save your discovery first.");
  // Existing service verifies Twilio sender ownership and retrieves Google calendars.
  // This does not send messages, invite attendees, or test OpenAI generation.
  const r = await verifyExistingSetup(request, undefined);
  if (!r.ok)
    throw new ConciergeError(
      "Live connection verification is unavailable. Review the existing integration settings; configuration alone is not verification.",
      503,
    );
  const result = await r.json();
  const done = (id: string) =>
    result.steps?.find((s: { id: string; done: boolean }) => s.id === id)
      ?.done === true;
  const checkedAt = new Date().toISOString();
  await mutate(owner, owner, crypto.randomUUID(), record.version, { milestones: { connectionReview: { checkedAt, sms: done("twilio"), calendar: done("google") } } }, "CONNECTIONS_VERIFIED");
  return apiOk({
    verifiedAt: new Date().toISOString(),
    sms: done("twilio")
      ? "Connected — subscriber sender ownership verified."
      : "Setup required — no verified subscriber sender.",
    calendar: done("google")
      ? "Connected — authorized calendar list retrieved."
      : "Setup required — calendar access not verified.",
    email:
      "Verification pending — email sender configuration requires its existing provider verification workflow.",
    assistant:
      "Verification pending — use a supervised authorized Assistant request.",
  });
});
