export type ImportIssue = { row: number; error: string };
export type ReviewRow = { firstName: string; phone: string; email: string; _sourceRow?: string };
/** Mirrors the RPC's matching rule; a shared identifier is a possible duplicate, not proof of identity. */
export function summarizeImport(rows: ReviewRow[], errors: ImportIssue[], contacts: {phone?: string | null; email?: string | null}[]) {
 const phones = new Set(contacts.flatMap(c => c.phone ? [c.phone.replace(/\D/g, "")] : []));
 const emails = new Set(contacts.flatMap(c => c.email ? [c.email.toLowerCase()] : []));
 const duplicates = rows.filter(row => phones.has(row.phone.replace(/\D/g, "")) || !!row.email && emails.has(row.email));
 const fileDuplicates = errors.filter(e => e.error === "Duplicate within this file; skipped.").length;
 return {totalRows: rows.length + errors.length, validNew: rows.length - duplicates.length,
   possibleDuplicates: duplicates.length + fileDuplicates, invalidRows: errors.length - fileDuplicates,
   existingContactsUnchanged: contacts.length,
   errors: [...errors, ...duplicates.map(row => ({row: Number(row._sourceRow) || rows.indexOf(row) + 2, error: "Possible existing-contact duplicate: shared phone or email; skipped without changes."}))]};
}
