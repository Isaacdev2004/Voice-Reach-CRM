import Papa from "papaparse";
/** Shared with the existing Contacts importer. First name and phone are required. */
export const CONTACT_IMPORT_HEADERS = ["firstName", "lastName", "phone", "email", "consent", "source"];
export function contactImportTemplate(sample = false) {
  return "\uFEFF" + Papa.unparse({ fields: CONTACT_IMPORT_HEADERS, data: sample ? [
    ["Jordan", "Harbor", "+12025550101", "jordan@example.test", "Unknown", "Website"],
    ["Taylor", "Coast", "+12025550102", "taylor@example.test", "Unknown", "Referral"],
  ] : [] }, { newline: "\r\n", escapeFormulae: true });
}
export function importErrorReport(errors: {row: number; error: string}[]) {
  return "\uFEFF" + Papa.unparse({fields: ["CSV Row", "Reason"], data: errors.map(e => [e.row, e.error])}, {escapeFormulae: true});
}
export function downloadImportCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8"}));
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
