import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { readDelivery } from "@/lib/delivery/store";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    const messages = await ownedRows("inbound_communications", "*", owner);
    const evidence = await readDelivery(owner).catch(() => null);
    return apiOk({
      messages,
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
