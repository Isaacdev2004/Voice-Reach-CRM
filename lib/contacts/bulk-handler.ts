import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const BulkDeleteSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
});

const BulkConsentSchema = z.object({
  action: z.literal("set_consent"),
  ids: z.array(z.string().uuid()).min(1).max(5000),
  consent: z.enum(["Yes", "No", "Unknown"]),
  consentDate: z.iso.date(),
  consentSource: z.string().trim().min(2),
  proof: z.string().trim().min(2),
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

export function createContactBulkHandler({ database, requireOwnerId, audit }: {
  database: SupabaseClient;
  requireOwnerId: () => Promise<string>;
  audit: typeof writeAuditLog;
}) { return withApiHandler(async (request) => {
  const ownerId = await requireOwnerId();
  const body = BodySchema.parse(await request.json());
  body.ids = [...new Set(body.ids)];
  // Authorize the complete selection before any mutation, including child-table inserts.
  for (let start = 0; start < body.ids.length; start += 200) {
    const ids = body.ids.slice(start, start + 200);
    const { data, error } = await database.from("contacts").select("id, owner_id")
      .eq("owner_id", ownerId).in("id", ids);
    if (error) return apiError("Unable to verify selected contacts. Please retry.", { status: 503 });
    if (!data || new Set(data.map(row => row.id)).size !== ids.length || data.some(row => row.owner_id !== ownerId || !ids.includes(row.id)))
      return apiError("One or more selected contacts are unavailable. Refresh your contacts and try again.", { status: 404 });
  }

  if (body.action === "delete") {
    const { error, count } = await database
      .from("contacts")
      .delete({ count: "exact" })
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError("Unable to update selected contacts. Please retry.", { status: 500 });

    await audit({
      ownerId,
      action: "CONTACTS_BULK_DELETED",
      entityType: "contacts",
      entityId: null,
      metadata: { count: count ?? 0 },
    });

    return apiOk({ ok: true, deleted: count ?? 0 });
  }

  if (body.action === "set_type") {
    const { error, count } = await database
      .from("contacts")
      .update({ type: body.type, updated_at: new Date().toISOString() }, { count: "exact" })
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError("Unable to update selected contacts. Please retry.", { status: 500 });

    await audit({
      ownerId,
      action: "CONTACTS_BULK_TYPE_SET",
      entityType: "contacts",
      entityId: null,
      metadata: { count: count ?? 0, type: body.type },
    });

    return apiOk({ ok: true, updated: count ?? 0 });
  }

  if (body.action === "set_category") {
    const { error, count } = await database
      .from("contacts")
      .update({
        category: body.category?.trim() || null,
        updated_at: new Date().toISOString(),
      }, { count: "exact" })
      .eq("owner_id", ownerId)
      .in("id", body.ids);

    if (error) return apiError("Unable to update selected contacts. Please retry.", { status: 500 });

    await audit({
      ownerId,
      action: "CONTACTS_BULK_CATEGORY_SET",
      entityType: "contacts",
      entityId: null,
      metadata: { count: count ?? 0, category: body.category },
    });

    return apiOk({ ok: true, updated: count ?? 0 });
  }

  const consentRows = body.ids.map((id) => ({
    owner_id: ownerId,
    contact_id: id,
    status: body.consent,
    consent_date: body.consentDate,
    source: body.consentSource,
    proof_reference: body.proof,
  }));

  const { error } = await database.from("consent_records").insert(consentRows);
  if (error) return apiError("Unable to update selected contacts. Please retry.", { status: 500 });

  await audit({
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
}
