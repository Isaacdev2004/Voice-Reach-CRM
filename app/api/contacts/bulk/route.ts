import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const BulkDeleteSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
});

const BulkConsentSchema = z.object({
  action: z.literal("set_consent"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
  consent: z.enum(["Yes", "No", "Unknown"]).default("Yes"),
  consentDate: z.string().min(4),
  consentSource: z.string().min(2),
  proof: z.string().min(2),
});

const BodySchema = z.union([BulkDeleteSchema, BulkConsentSchema]);

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  if (body.action === "delete") {
    const { error } = await supabaseAdmin
      .from("contacts")
      .delete()
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError(error.message, { status: 500 });

    await writeAuditLog({
      ownerId,
      action: "CONTACTS_BULK_DELETED",
      entityType: "contacts",
      entityId: null,
      metadata: { count: body.ids.length },
    });

    return apiOk({ ok: true, deleted: body.ids.length });
  }

  // action === "set_consent"
  const consentRows = body.ids.map((id) => ({
    owner_id: ownerId,
    contact_id: id,
    status: body.consent,
    consent_date: body.consentDate,
    source: body.consentSource,
    proof_reference: body.proof,
  }));

  const { error } = await supabaseAdmin.from("consent_records").insert(consentRows);
  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CONTACTS_BULK_CONSENT_SET",
    entityType: "consent_records",
    entityId: null,
    metadata: {
      count: body.ids.length,
      consent: body.consent,
      consentSource: body.consentSource,
    },
  });

  return apiOk({ ok: true, updated: body.ids.length });
});

