import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { createContactListHandler } from "@/lib/contacts/list-handler";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { evaluateTriggers } from "@/lib/automations/engine";
import { CreateContactSchema } from "@/lib/contacts/schemas";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { normalizePhone } from "@/lib/phone";
import { apiErrorFromSupabase } from "@/lib/supabase-errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(createContactListHandler({
  requireOwnerId: requireUserId,
  readContacts: ownerId => readContactSnapshot(supabaseAdmin, ownerId),
  loadCategories: async ownerId => (await loadSavedSettings(ownerId))?.contactCategories,
}));

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = CreateContactSchema.parse(await request.json());

  const { assertCanAddContacts } = await import("@/lib/billing/plan-limits");
  const limitCheck = await assertCanAddContacts(ownerId, 1);
  if (!limitCheck.ok) {
    return apiError(limitCheck.error, { status: 403, code: limitCheck.code });
  }

  if (body.consent === "Yes") {
    if (!body.consentDate?.trim()) {
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

  const baseRow = {
    owner_id: ownerId,
    first_name: body.firstName,
    last_name: body.lastName,
    phone: normalizePhone(body.phone),
    email: body.email || null,
    type: body.type || "Cold Lead",
    source: body.source,
    dnc: body.dnc,
    notes: body.notes,
  };

  let { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .insert({
      ...baseRow,
      category: body.category?.trim() || null,
    })
    .select("*")
    .single();

  // Older DBs may not have category yet - retry without it
  if (contactError?.message?.toLowerCase().includes("category")) {
    const retry = await supabaseAdmin.from("contacts").insert(baseRow).select("*").single();
    contact = retry.data;
    contactError = retry.error;
  }

  if (contactError) {
    const mapped = apiErrorFromSupabase(contactError);
    if (mapped) return mapped;
  }

  const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
    owner_id: ownerId,
    contact_id: contact.id,
    status: body.consent,
    consent_date: body.consentDate || null,
    source: body.consentSource || null,
    proof_reference: body.proof || null,
    notes: body.notes || null,
  });

  if (consentError) {
    const mapped = apiErrorFromSupabase(consentError);
    if (mapped) return mapped;
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_CREATED",
    entityType: "contact",
    entityId: contact.id,
    metadata: { phone: contact.phone, consent: body.consent },
  });

  await evaluateTriggers({ ownerId, contactId: contact.id, event: "contact_added" }).catch(() =>
    undefined,
  );

  return apiOk({ contact }, { status: 201 });
});
