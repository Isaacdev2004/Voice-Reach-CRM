import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
export const POST = withApiHandler<{
  params: Promise<{
    id: string;
  }>;
}>(async (req, ctx) => {
  const owner = await requireUserId();
  const { id } = await ctx.params;
  const body = z
    .object({
      outcome: z.enum([
        "Connected",
        "No answer",
        "Voicemail left",
        "Callback requested",
      ]),
      notes: z.string().trim().max(2000).default(""),
    })
    .safeParse(await req.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !body.success)
    return apiError("Check the contact and call details.", { status: 400 });
  const c = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (c.error)
    return apiError("Contact information is unavailable.", { status: 503 });
  if (!c.data) return apiError("Contact not found.", { status: 404 });
  try {
    await writeAuditLog({
      ownerId: owner,
      action: "CALL_LOGGED",
      entityType: "contact",
      entityId: id,
      metadata: body.data,
    });
    return apiOk({ saved: true }, { status: 201 });
  } catch {
    return apiError(
      "Call could not be logged. Your notes have not been saved.",
      { status: 503 },
    );
  }
});
