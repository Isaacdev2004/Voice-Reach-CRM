import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isUuid } from "@/lib/contacts/is-uuid";
import { PatchContactSchema } from "@/lib/contacts/schemas";
import { normalizePhone } from "@/lib/phone";
import { apiErrorFromSupabase } from "@/lib/supabase-errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

async function loadContact(ownerId: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*, consent_records(*)")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (error) return { error, contact: null };
  if (!data) return { error: null, contact: null };

  const records = Array.isArray(data.consent_records) ? [...data.consent_records] : [];
  records.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return { error: null, contact: { ...data, consent_records: records } };
}

export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Contact not found", { status: 404, code: "not_found" });

  const { error, contact } = await loadContact(ownerId, id);
  if (error) {
    const mapped = apiErrorFromSupabase(error);
    if (mapped) return mapped;
  }
  if (!contact) return apiError("Contact not found", { status: 404, code: "not_found" });

  return apiOk({ contact });
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Contact not found", { status: 404, code: "not_found" });

  const body = PatchContactSchema.parse(await request.json());

  if (body.consent === "Yes") {
    if (!body.consentDate) {
      return apiError("Consent date is required when consent is Yes.", {
        status: 400,
        code: "validation_error",
      });
    }
    if (!body.consentSource?.trim()) {
      return apiError("Consent source is required when consent is Yes.", {
        status: 400,
        code: "validation_error",
      });
    }
    if (!body.proof?.trim()) {
      return apiError("Proof reference is required when consent is Yes.", {
        status: 400,
        code: "validation_error",
      });
    }
  }

  const { data: existing, error: findError } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    const mapped = apiErrorFromSupabase(findError);
    if (mapped) return mapped;
  }
  if (!existing) return apiError("Contact not found", { status: 404, code: "not_found" });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.firstName !== undefined) updates.first_name = body.firstName;
  if (body.lastName !== undefined) updates.last_name = body.lastName;
  if (body.phone !== undefined) updates.phone = normalizePhone(body.phone);
  if (body.email !== undefined) updates.email = body.email || null;
  if (body.type !== undefined) updates.type = body.type;
  if (body.source !== undefined) updates.source = body.source;
  if (body.dnc !== undefined) updates.dnc = body.dnc;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.preferredArea !== undefined) updates.preferred_area = body.preferredArea?.trim() || null;
  if (body.budget !== undefined) updates.budget = body.budget;
  if (body.leadType !== undefined) updates.lead_type = body.leadType;

  const { error: updateError } = await supabaseAdmin
    .from("contacts")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (updateError) {
    const mapped = apiErrorFromSupabase(updateError);
    if (mapped) return mapped;
    return apiError(updateError.message, { status: 500 });
  }

  if (body.consent !== undefined) {
    const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
      owner_id: ownerId,
      contact_id: id,
      status: body.consent,
      consent_date: body.consentDate || null,
      source: body.consentSource?.trim() || null,
      proof_reference: body.proof?.trim() || null,
      notes: body.notes ?? null,
    });

    if (consentError) {
      const mapped = apiErrorFromSupabase(consentError);
      if (mapped) return mapped;
      return apiError(consentError.message, { status: 500 });
    }
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_UPDATED",
    entityType: "contact",
    entityId: id,
    metadata: {
      fields: Object.keys(updates),
      consent: body.consent ?? null,
    },
  }).catch(() => undefined);

  const { contact } = await loadContact(ownerId, id);
  return apiOk({ contact });
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Contact not found", { status: 404, code: "not_found" });

  const { data: existing, error: findError } = await supabaseAdmin
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    const mapped = apiErrorFromSupabase(findError);
    if (mapped) return mapped;
  }
  if (!existing) return apiError("Contact not found", { status: 404, code: "not_found" });

  const { error: deleteError } = await supabaseAdmin
    .from("contacts")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (deleteError) {
    const mapped = apiErrorFromSupabase(deleteError);
    if (mapped) return mapped;
    return apiError(deleteError.message, { status: 500 });
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_DELETED",
    entityType: "contact",
    entityId: null,
    metadata: {
      deletedContactId: id,
      name: [existing.first_name, existing.last_name].filter(Boolean).join(" "),
    },
  }).catch(() => undefined);

  return apiOk({ ok: true });
});
