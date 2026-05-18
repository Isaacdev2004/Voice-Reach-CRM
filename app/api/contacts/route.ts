import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizePhone } from "@/lib/phone";
import { writeAuditLog } from "@/lib/audit";

const CreateContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().optional().default(""),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  type: z.string().optional().default("Imported Contact"),
  source: z.string().optional().default("Manual entry"),
  dnc: z.boolean().optional().default(false),
  notes: z.string().optional().default(""),
  consent: z.enum(["Yes", "No", "Unknown"]).optional().default("Unknown"),
  consentDate: z.string().optional().default(""),
  consentSource: z.string().optional().default(""),
  proof: z.string().optional().default(""),
});

export async function GET() {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("*, consent_records(*)")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data });
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

  await writeAuditLog({ ownerId, action: "CONTACT_CREATED", entityType: "contact", entityId: contact.id, metadata: { phone: contact.phone, consent: body.consent } });

  return NextResponse.json({ contact }, { status: 201 });
}
