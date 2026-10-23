import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { readDelivery } from "@/lib/delivery/store";
import {
  sharedReceiver,
  summarizeCall,
  type CallEvent,
} from "@/lib/communications/safety";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    const messages = await ownedRows<{
      id: string;
      kind: string;
      provider_id: string;
      to_number: string;
      [key: string]: unknown;
    }>("inbound_communications", "*", owner);
    const callEvents = await ownedRows<{ id: string; metadata: CallEvent }>(
      "audit_logs",
      "id, metadata",
      owner,
      undefined,
      { action: "TWILIO_CALL_EVENT" },
    ).catch(() => null);
    const evidence = await readDelivery(owner).catch(() => null);
    return apiOk({
      messages: messages
        .filter((m) => !sharedReceiver(m.to_number))
        .map((m) =>
          m.kind === "call"
            ? {
                ...m,
                callEvidence: callEvents
                  ? summarizeCall(
                      callEvents
                        .filter(
                          (e) =>
                            e.metadata.sid === m.provider_id ||
                            e.metadata.parentSid === m.provider_id,
                        )
                        .map((e) => e.metadata),
                    )
                  : null,
              }
            : m,
        ),
      outbound:
        evidence?.records
          .filter((r) => r.channel === "sms")
          .map((r) => ({
            id: r.id,
            contact_id: r.contact_id,
            body: r.body,
            status: r.indicator,
            created_at: r.created_at,
          })) ?? [],
      outboundAvailable: !!evidence,
    });
  } catch {
    return apiError(
      "Conversations are unavailable. Verify the Communications migration and receiving-number configuration.",
      { status: 503 },
    );
  }
});
const input = z.object({
  id: z.string().uuid(),
  classification: z.enum([
    "Interested",
    "Appointment request",
    "Question",
    "Not interested",
    "Opt-out",
    "Needs review",
  ]),
});
export const PATCH = withApiHandler(async (request) => {
  const owner = await requireUserId(),
    body = input.parse(await request.json());
  const result = await supabaseAdmin
    .from("inbound_communications")
    .update({ classification: body.classification })
    .eq("id", body.id)
    .eq("owner_id", owner)
    .select("id")
    .maybeSingle();
  if (result.error)
    return apiError("Could not save classification.", { status: 503 });
  if (!result.data) return apiError("Conversation not found.", { status: 404 });
  return apiOk({ ok: true });
});
