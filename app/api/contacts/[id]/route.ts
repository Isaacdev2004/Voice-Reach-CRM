import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { PatchContactSchema } from "@/lib/contacts/schemas";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const ownerId = await requireUserId();
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*, consent_records(*)")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  return NextResponse.json({ contact: data });
}

export async function PATCH(request: Request, context: RouteContext) {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  const body = PatchContactSchema.parse(await request.json());

  const { data: existing, error: findError } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.firstName !== undefined) updates.first_name = body.firstName;
  if (body.lastName !== undefined) updates.last_name = body.lastName;
  if (body.phone !== undefined) updates.phone = normalizePhone(body.phone);
  if (body.email !== undefined) updates.email = body.email || null;
  if (body.type !== undefined) updates.type = body.type;
  if (body.source !== undefined) updates.source = body.source;
  if (body.dnc !== undefined) updates.dnc = body.dnc;
  if (body.notes !== undefined) updates.notes = body.notes;

  const { data: contact, error: updateError } = await supabaseAdmin
    .from("contacts")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select("*, consent_records(*)")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  if (body.consent !== undefined) {
    const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
      owner_id: ownerId,
      contact_id: id,
      status: body.consent,
      consent_date: body.consentDate || null,
      source: body.consentSource || null,
      proof_reference: body.proof || null,
      notes: body.notes ?? null,
    });

    if (consentError) {
      return NextResponse.json({ error: consentError.message }, { status: 500 });
    }

    const { data: refreshed } = await supabaseAdmin
      .from("contacts")
      .select("*, consent_records(*)")
      .eq("owner_id", ownerId)
      .eq("id", id)
      .single();

    await writeAuditLog({
      ownerId,
      action: "CONTACT_UPDATED",
      entityType: "contact",
      entityId: id,
      metadata: { fields: Object.keys(updates), consent: body.consent },
    });

    return NextResponse.json({ contact: refreshed ?? contact });
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_UPDATED",
    entityType: "contact",
    entityId: id,
    metadata: { fields: Object.keys(updates) },
  });

  return NextResponse.json({ contact });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const ownerId = await requireUserId();
  const { id } = await context.params;

  const { data: existing, error: findError } = await supabaseAdmin
    .from("contacts")
    .select("id, first_name, last_name")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const { error: deleteError } = await supabaseAdmin
    .from("contacts")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CONTACT_DELETED",
    entityType: "contact",
    entityId: null,
    metadata: {
      deletedContactId: id,
      name: [existing.first_name, existing.last_name].filter(Boolean).join(" "),
    },
  });

  return NextResponse.json({ ok: true });
}
