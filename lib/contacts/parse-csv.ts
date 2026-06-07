import type { ContactImportRow } from "@/types/api";
import Papa from "papaparse";

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "");
}

const HEADER_ALIASES: Record<string, keyof ContactImportRow> = {
  firstname: "firstName",
  first_name: "firstName",
  lastname: "lastName",
  last_name: "lastName",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  email: "email",
  emailaddress: "email",
  consent: "consent",
  consentstatus: "consent",
  consentdate: "consentDate",
  consent_date: "consentDate",
  consentsource: "consentSource",
  consent_source: "consentSource",
  source: "source",
  proof: "proof",
  consentproof: "proof",
  consent_proof: "proof",
  type: "type",
  dnc: "dnc",
  notes: "notes",
};

function findHeaderLineIndex(lines: string[]): number {
  return lines.findIndex((line) => {
    const cells = line.split(",").map((c) => normalizeHeader(c));
    const hasFirst = cells.some((c) => c === "firstname" || c === "first_name");
    const hasPhone = cells.some((c) => c === "phone" || c === "phonenumber" || c === "mobile");
    return hasFirst && hasPhone;
  });
}

function mapRow(raw: Record<string, unknown>): ContactImportRow {
  const mapped: ContactImportRow = {};
  for (const [key, value] of Object.entries(raw)) {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (alias) mapped[alias] = String(value ?? "").trim() as never;
  }
  return mapped;
}

export function parseContactCsv(text: string) {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerIndex = findHeaderLineIndex(lines);
  const csvText = headerIndex >= 0 ? lines.slice(headerIndex).join("\n") : cleaned;

  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows = parsed.data.map(mapRow);
  return { rows, parseErrors: parsed.errors, headerIndex };
}

export function isValidImportPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.length >= 10 && digits !== "0".repeat(digits.length);
}

export function enrichConsentForImport(
  row: ContactImportRow,
  fileName: string,
  rowIndex: number,
): {
  status: string;
  consentDate: string | null;
  consentSource: string | null;
  proof: string | null;
} {
  const status = ["Yes", "No", "Unknown"].includes(row.consent ?? "")
    ? (row.consent as string)
    : "Unknown";

  if (status !== "Yes") {
    return {
      status,
      consentDate: row.consentDate || row.consent_date || null,
      consentSource: row.consentSource || row.consent_source || null,
      proof: row.proof || row.consentProof || row.consent_proof || null,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  return {
    status: "Yes",
    consentDate: row.consentDate || row.consent_date || today,
    consentSource: row.consentSource || row.consent_source || row.source || "CSV import",
    proof: row.proof || row.consentProof || row.consent_proof || `CSV:${fileName}:row${rowIndex + 2}`,
  };
}
