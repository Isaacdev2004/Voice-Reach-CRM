import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { evaluateTriggers } from "@/lib/automations/engine";
import { evaluateEligibility } from "@/lib/compliance";
import { CreateContactSchema, filterContactsByQuery } from "@/lib/contacts/schemas";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*, consent_records(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });

  const raw = q ? filterContactsByQuery(data ?? [], q) : (data ?? []);
  const contacts = raw.map((contact) => ({
    ...contact,
    eligibility: evaluateEligibility(contact),
  }));
  const eligibleCount = contacts.filter((c) => c.eligibility.eligible).length;
  return apiOk({
    contacts,
    total: (data ?? []).length,
    filtered: contacts.length,
    eligibleCount,
    q,
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = CreateContactSchema.parse(await request.json());

  const { data: contact, error: contactError } = await supabaseAdmin
    .from("contacts")
    .insert({
      owner_id: ownerId,
      first_name: body.firstName,
      last_name: body.lastName,
      phone: normalizePhone(body.phone),
      email: body.email || null,
      type: body.type,
      source: body.source,
      dnc: body.dnc,
      notes: body.notes,
    })
    .select("*")
    .single();

  if (contactError) return apiError(contactError.message, { status: 500 });

  const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
    owner_id: ownerId,
    contact_id: contact.id,
    status: body.consent,
    consent_date: body.consentDate || null,
    source: body.consentSource || null,
    proof_reference: body.proof || null,
    notes: body.notes || null,
  });

  if (consentError) return apiError(consentError.message, { status: 500 });

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
