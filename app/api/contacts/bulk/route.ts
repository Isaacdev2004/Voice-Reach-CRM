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

const BulkTypeSchema = z.object({
  action: z.literal("set_type"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
  type: z.string().min(2),
});

const BulkCategorySchema = z.object({
  action: z.literal("set_category"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
  category: z.string().min(1).max(40).nullable(),
});

const BodySchema = z.union([
  BulkDeleteSchema,
  BulkConsentSchema,
  BulkTypeSchema,
  BulkCategorySchema,
]);

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

  if (body.action === "set_type") {
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({ type: body.type, updated_at: new Date().toISOString() })
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError(error.message, { status: 500 });

    await writeAuditLog({
      ownerId,
      action: "CONTACTS_BULK_TYPE_SET",
      entityType: "contacts",
      entityId: null,
      metadata: { count: body.ids.length, type: body.type },
    });

    return apiOk({ ok: true, updated: body.ids.length });
  }

  if (body.action === "set_category") {
    const { error } = await supabaseAdmin
      .from("contacts")
      .update({
        category: body.category?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError(error.message, { status: 500 });

    await writeAuditLog({
      ownerId,
      action: "CONTACTS_BULK_CATEGORY_SET",
      entityType: "contacts",
      entityId: null,
      metadata: { count: body.ids.length, category: body.category },
    });

    return apiOk({ ok: true, updated: body.ids.length });
  }

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
