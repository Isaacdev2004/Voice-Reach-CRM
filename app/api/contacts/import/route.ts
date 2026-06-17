import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  enrichConsentForImport,
  isValidImportPhone,
  parseContactCsv,
} from "@/lib/contacts/parse-csv";
import { normalizePhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  const { rows, parseErrors, headerIndex } = parseContactCsv(text);

  if (parseErrors.length) {
    return apiError("CSV parse error", {
      status: 400,
      code: "csv_parse_error",
      details: parseErrors,
    });
  }

  if (rows.length === 0) {
    return apiError(
      "No contact rows found. Make sure your file has a header row with firstName and phone.",
      { status: 400, code: "empty_csv" },
    );
  }

  const imported = [];
  const errors: { row: number; error: string }[] = [];
  const rowOffset = headerIndex >= 0 ? headerIndex + 2 : 2;

  for (const [index, row] of rows.entries()) {
    const firstName = (row.firstName || row.first_name || "").trim();
    const phone = (row.phone || "").trim();

    if (!firstName || !phone) {
      errors.push({ row: index + rowOffset, error: "Missing firstName or phone" });
      continue;
    }

    if (!isValidImportPhone(phone)) {
      errors.push({ row: index + rowOffset, error: "Invalid or missing phone number" });
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
        type: row.type || "Cold Lead",
        source: row.source || "CSV import",
        dnc: normalizeBoolean(row.dnc),
        notes: row.notes || null,
      })
      .select("*")
      .single();

    if (contactError) {
      errors.push({ row: index + rowOffset, error: contactError.message });
      continue;
    }

    const consent = enrichConsentForImport(row, file.name, index);

    const { error: consentError } = await supabaseAdmin.from("consent_records").insert({
      owner_id: ownerId,
      contact_id: contact.id,
      status: consent.status,
      consent_date: consent.consentDate,
      source: consent.consentSource,
      proof_reference: consent.proof,
      notes: row.notes || null,
    });

    if (consentError) errors.push({ row: index + rowOffset, error: consentError.message });
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
