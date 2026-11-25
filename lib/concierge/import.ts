import Papa from "papaparse";
import { createHash } from "node:crypto";
import { z } from "zod";
import { isValidImportPhone, parseContactCsv } from "@/lib/contacts/parse-csv";
import { normalizePhone } from "@/lib/phone";
import { Mapping } from "./schema";
import { ConciergeError } from "./access";
export function csvColumns(csv: string) {
  if (new TextEncoder().encode(csv).length > 1024 * 1024)
    throw new ConciergeError("CSV must be no larger than 1 MB.", 413);
  const raw = Papa.parse<string[]>(csv.replace(/^\uFEFF/, ""), {
    skipEmptyLines: true,
  });
  if (raw.errors.length || !raw.data.length)
    throw new ConciergeError("Choose a valid UTF-8 CSV with a header row.");
  const columns = raw.data[0].map((x) => x.trim());
  if (
    columns.length > 50 ||
    new Set(columns).size !== columns.length ||
    columns.some((x) => !x || x.length > 150)
  )
    throw new ConciergeError(
      "Headers must be unique and no longer than 150 characters; at most 50 columns.",
    );
  if (raw.data.length > 501)
    throw new ConciergeError("Import up to 500 contacts at a time.");
  // Papa cursor offsets preserve physical CSV line numbers, including quoted multiline cells.
  const rowNumbers: number[] = [];
  let previous = 0, previousLine = 1;
  const input = csv.replace(/^\uFEFF/, "");
  Papa.parse<string[]>(input, {
    skipEmptyLines: true,
    step(result) {
      const start = input.slice(previous).search(/[^\r\n]/);
      const offset = previous + Math.max(0, start);
      rowNumbers.push(previousLine + (input.slice(previous, offset).match(/\r\n|\r|\n/g) ?? []).length);
      previousLine += (input.slice(previous, result.meta.cursor).match(/\r\n|\r|\n/g) ?? []).length;
      previous = result.meta.cursor;
    },
  });
  return { columns, values: raw.data.slice(1), rowNumbers: rowNumbers.slice(1) };
}
export function prepareCsv(csv: string, mapping: unknown) {
  const { columns, values, rowNumbers } = csvColumns(csv),
    map = Mapping.parse(mapping);
  const chosen = Object.values(map);
  if (
    new Set(chosen).size !== chosen.length ||
    chosen.some((x) => !columns.includes(x))
  )
    throw new ConciergeError(
      "Map each source column once, using the detected headers.",
    );
  const widthErrors = values.flatMap((row, i) => row.length === columns.length ? [] : [{row: rowNumbers[i], error: "Column count does not match the CSV headers."}]);
  const validIndexes = values.flatMap((row,i) => row.length === columns.length ? [i] : []);
  const canonical = Papa.unparse(
    validIndexes.map((index) => {
      const row = values[index];
      return Object.fromEntries(
        Object.entries(map).map(([field, column]) => [
          field,
          row[columns.indexOf(column)],
        ]),
      );
    }),
  );
  const { rows, parseErrors } = parseContactCsv(canonical);
  if (parseErrors.length)
    throw new ConciergeError("CSV mapping could not be read.");
  const accepted: Record<string, string>[] = [],
    errors: { row: number; error: string }[] = [...widthErrors];
  const phones = new Set(),
    emails = new Set();
  for (const [i, row] of rows.entries()) {
    const sourceIndex = validIndexes[i];
    const source = values[sourceIndex],
      firstName = String(row.firstName ?? "").trim(),
      phone = String(row.phone ?? "").trim(),
      email = String(row.email ?? "")
        .trim()
        .toLowerCase();
    if (
      !firstName ||
      firstName.length > 200 ||
      !isValidImportPhone(phone) ||
      phone.replace(/\D/g, "").length > 15 ||
      (email && !z.string().email().safeParse(email).success)
    ) {
      errors.push({ row: rowNumbers[sourceIndex], error: [!firstName ? "First name is required." : firstName.length > 200 ? "First name exceeds 200 characters." : "", !isValidImportPhone(phone) || phone.replace(/\D/g, "").length > 15 ? "Phone must contain 10–15 valid digits." : "", email && !z.string().email().safeParse(email).success ? "Email is invalid." : ""].filter(Boolean).join(" ") });
      continue;
    }
    const normalized = normalizePhone(phone);
    if (phones.has(normalized) || (email && emails.has(email))) {
      errors.push({
        row: rowNumbers[sourceIndex],
        error: "Duplicate within this file; skipped.",
      });
      continue;
    }
    const extra = [
      map.category
        ? `Imported category: ${source[columns.indexOf(map.category)]}`
        : "",
      map.tags ? `Imported tags: ${source[columns.indexOf(map.tags)]}` : "",
      map.followUpDate
        ? `Imported follow-up date (review required): ${source[columns.indexOf(map.followUpDate)]}`
        : "",
    ].filter(Boolean);
    const notes = [row.notes ?? "", ...extra].filter(Boolean).join("\n");
    if (
      notes.length > 5000 ||
      String(row.source ?? "").length > 300 ||
      String(row.type ?? "").length > 100
    ) {
      errors.push({
        row: rowNumbers[sourceIndex],
        error: "Notes, source or stage exceeds the supported length.",
      });
      continue;
    }
    phones.add(normalized);
    if (email) emails.add(email);
    accepted.push({
      _sourceRow: String(rowNumbers[sourceIndex]),
      firstName,
      lastName: String(row.lastName ?? "").slice(0, 200),
      phone: normalized,
      email,
      type: String(row.type ?? "Imported Contact"),
      source: String(row.source ?? "Concierge CSV import"),
      notes,
    });
  }
  return {
    rows: accepted,
    errors,
    fingerprint: createHash("sha256")
      .update(JSON.stringify({ mapping: map, rows: accepted, errors }))
      .digest("hex"),
  };
}
