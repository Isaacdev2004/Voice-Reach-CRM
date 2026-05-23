import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { CreateContactSchema, filterContactsByQuery } from "@/lib/contacts/schemas";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const ownerId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*, consent_records(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const contacts = q ? filterContactsByQuery(data ?? [], q) : (data ?? []);

  return NextResponse.json({ contacts, total: (data ?? []).length, filtered: contacts.length, q });
}

export async function POST(request: Request) {
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

  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 });

  const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
    owner_id: ownerId,
    contact_id: contact.id,
    status: body.consent,
    consent_date: body.consentDate || null,
    source: body.consentSource || null,
    proof_reference: body.proof || null,
    notes: body.notes || null,
  });

  if (consentError) return NextResponse.json({ error: consentError.message }, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CONTACT_CREATED",
    entityType: "contact",
    entityId: contact.id,
    metadata: { phone: contact.phone, consent: body.consent },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
