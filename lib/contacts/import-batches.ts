import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assertCanAddContacts } from "@/lib/billing/plan-limits";
import { enrichConsentForImport, isValidImportPhone } from "./parse-csv";
import { normalizePhone } from "@/lib/phone";
import type { ContactImportRow as CsvRow } from "@/types/api";
export async function importContactBatches(
  owner: string,
  rows: CsvRow[],
  fileName: string,
  rowOffset: number,
) {
  const allowance = await assertCanAddContacts(owner, 0);
  const errors: { row: number; error: string }[] = [];
  const prepared = rows.flatMap((r, i) => {
    const first = (r.firstName || r.first_name || "").trim(),
      phone = (r.phone || "").trim();
    if (!first || !isValidImportPhone(phone)) {
      errors.push({
        row: i + rowOffset,
        error: "Missing first name or invalid phone number",
      });
      return [];
    }
    return [
      {
        row: i + rowOffset,
        first_name: first,
        last_name: r.lastName || r.last_name || null,
        phone: normalizePhone(phone),
        email: r.email || null,
        type: r.type || "Cold Lead",
        category: r.category?.trim().slice(0, 40) || null,
        source: r.source || "CSV import",
        dnc: ["true", "yes", "1"].includes(String(r.dnc || "").toLowerCase()),
        notes: r.notes || null,
      },
    ];
  });
  let imported = 0,
    duplicates = 0;
  for (let offset = 0; offset < prepared.length; offset += 100) {
    const batch = prepared.slice(offset, offset + 100);
    const result = await supabaseAdmin.rpc("import_contact_batch", {
      p_owner: owner,
      p_rows: batch,
      p_base_limit: allowance.usage.contactsLimit,
    });
    if (result.error) {
      const quota = String(result.error.message).includes(
        "contact_allowance_exceeded",
      );
      for (const row of prepared.slice(offset))
        errors.push({
          row: row.row,
          error: quota
            ? "Workspace contact allowance reached. This row was not imported."
            : "Import could not be confirmed. Retry this file; duplicate protection preserves existing contacts.",
        });
      break;
    }
    if (!Array.isArray(result.data) || result.data.length !== batch.length)
      throw Error(
        "Import results could not be verified. Retry the file; duplicate protection remains active.",
      );
    const consentRows = [];
    for (const item of result.data) {
      if (item.created === false && item.duplicate === true) {
        duplicates++;
        continue;
      }
      const contact = item.contact;
      if (!item.created || !contact?.id || contact.owner_id !== owner)
        throw Error("Import ownership could not be verified.");
      imported++;
      const source = rows[item.row - rowOffset],
        consent = enrichConsentForImport(
          source,
          fileName,
          item.row - rowOffset,
        );
      consentRows.push({
        owner_id: owner,
        contact_id: contact.id,
        status: consent.status,
        consent_date: consent.consentDate,
        source: consent.consentSource,
        proof_reference: consent.proof,
        notes: source.notes || null,
      });
    }
    if (consentRows.length) {
      const consent = await supabaseAdmin
        .from("consent_records")
        .insert(consentRows);
      if (consent.error)
        errors.push({
          row: batch[0].row,
          error:
            "Contacts were created, but consent evidence could not be saved. Review these contacts before any communication.",
        });
    }
  }
  return { imported, duplicates, errors };
}
