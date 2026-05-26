import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { ContactImportRow } from "@/types/api";
import Papa from "papaparse";

function normalizeBoolean(value: unknown) {
  return ["true", "yes", "1"].includes(String(value || "").toLowerCase());
}

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return apiError("CSV file is required under form field 'file'.", { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse<ContactImportRow>(text, { header: true, skipEmptyLines: true });

  if (parsed.errors.length) {
    return apiError("CSV parse error", {
      status: 400,
      code: "csv_parse_error",
      details: parsed.errors,
    });
  }

  const imported = [];
  const errors: { row: number; error: string }[] = [];

  for (const [index, row] of parsed.data.entries()) {
    const firstName = row.firstName || row.first_name || "";
    const phone = row.phone || "";

    if (!firstName || !phone) {
      errors.push({ row: index + 2, error: "Missing firstName or phone" });
      continue;
    }

    const { data: contact, error: contactError } = await supabaseAdmin
      .from("contacts")
      .insert({
        owner_id: ownerId,
        first_name: firstName,
        last_name: row.lastName || row.last_name || null,
        phone: normalizePhone(phone),
        email: row.email || null,
        type: row.type || "Imported Contact",
        source: row.source || "CSV import",
        dnc: normalizeBoolean(row.dnc),
        notes: row.notes || null,
      })
      .select("*")
      .single();

    if (contactError) {
      errors.push({ row: index + 2, error: contactError.message });
      continue;
    }

    const consentStatus = row.consent || "Unknown";
    const consentDate = row.consentDate || row.consent_date || null;
    const consentSource = row.consentSource || row.consent_source || null;
    const proof = row.proof || row.consentProof || row.consent_proof || null;

    const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
      owner_id: ownerId,
      contact_id: contact.id,
      status: ["Yes", "No", "Unknown"].includes(consentStatus) ? consentStatus : "Unknown",
      consent_date: consentDate,
      source: consentSource,
      proof_reference: proof,
      notes: row.notes || null,
    });

    if (consentError) errors.push({ row: index + 2, error: consentError.message });
    imported.push(contact);
  }

  await writeAuditLog({
    ownerId,
    action: "CSV_IMPORTED",
    entityType: "contacts",
    metadata: { fileName: file.name, imported: imported.length, errors: errors.length },
  });

  return apiOk({ imported: imported.length, errors });
});
