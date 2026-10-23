import { calculate, DISCLOSURE, usd, type Calculation } from "./calculators";
import type { Partner, ReportContext } from "./schemas";
export type Branding = {
  name: string;
  phone: string;
  headshot: string;
  brokerage: string;
  jobTitle: string;
};
export type Client = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  property_address?: string | null;
  preferred_area?: string | null;
  budget?: number | null;
};
export function reportLines(
  calculation: Calculation,
  context: ReportContext,
  branding: Branding,
  partners: Partner[],
  client?: Client,
) {
  const r = calculate(calculation),
    lines = [
      context.reportTitle || r.title,
      "PRELIMINARY ESTIMATE",
      `Prepared: ${context.preparedDate || new Date().toISOString().slice(0, 10)}`,
      `Prepared by: ${[branding.name, branding.jobTitle, branding.brokerage, branding.phone].filter(Boolean).join(" | ") || "Not provided"}`,
      `Client: ${client ? [client.first_name, client.last_name].filter(Boolean).join(" ") : "Not selected"}`,
      `Property: ${context.address || "Not provided"}`,
      `Location: ${[context.county, context.state].filter(Boolean).join(", ") || "Not provided"}`,
      `Transaction: ${context.transaction || "Not provided"} | Closing: ${context.closingDate || "Not provided"}`,
      "",
      ...r.lines.map((l) => `${l.label}: ${usd(l.amount)}`),
      "",
      `${r.totalLabel}: ${usd(r.total)}`,
      ...r.details.map((d) => `${d.label}: ${d.value}`),
    ];
  for (const o of r.offers ?? [])
    lines.push(
      `${o.label}: ${o.financing || "Financing not provided"}; closing ${o.closingDate || "not provided"}; contingencies: ${o.contingencies || "not provided"}`,
    );
  const fees =
    calculation.kind === "offers"
      ? calculation.offers.flatMap((o) =>
          o.fees.map((f) => ({ ...f, label: `${o.label}: ${f.label}` })),
        )
      : calculation.fees;
  lines.push(
    "",
    "FEE SOURCES",
    ...fees.map(
      (f) =>
        `${f.label}: ${usd(f.amount)} | ${f.source}${f.reference ? ` | ${f.reference}` : ""}${f.effectiveDate ? ` | Effective ${f.effectiveDate}` : ""}`,
    ),
  );
  for (const p of partners)
    lines.push(
      "",
      `${p.kind === "title" ? "Title partner" : "Lender"}: ${p.name}`,
      [p.contact, p.phone, p.email, p.address, p.website, p.license]
        .filter(Boolean)
        .join(" | "),
      p.brandingAuthorized
        ? "Subscriber confirms permission for partner branding."
        : "Contact reference only; partner co-branding has not been authorized.",
    );
  lines.push(
    "",
    "ASSUMPTIONS",
    context.assumptions ||
      "All unverified inputs are subscriber-entered estimates. Omitted fees are excluded; verify locally before relying on the report.",
    "",
    DISCLOSURE,
  );
  if (context.disclosures) lines.push("", context.disclosures);
  return lines;
}
const ascii = (s: string) => s.normalize("NFKD").replace(/[^\x20-\x7e]/g, "-");
function wrap(lines: string[], max = 88) {
  return lines.flatMap((line) => {
    if (!line) return [""];
    const result: string[] = [];
    let remaining = line;
    while (remaining.length > max) {
      let i = remaining.lastIndexOf(" ", max);
      if (i < 1) i = max;
      result.push(remaining.slice(0, i));
      remaining = remaining.slice(i).trimStart();
    }
    result.push(remaining);
    return result;
  });
}
/** Self-contained, paginated text PDF; outputs use the same verified calculation as the preview. No external PDF service. */
export function reportPdf(lines: string[]): Uint8Array {
  const wrapped = wrap(lines.map(ascii)),
    pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 43)
    pages.push(wrapped.slice(i, i + 43));
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const pageIds: number[] = [];
  pages.forEach((page, index) => {
    const pageId = objects.length + 1,
      streamId = pageId + 1;
    pageIds.push(pageId);
    const escape = (x: string) => x.replace(/([\\()])/g, "\\$1");
    let stream =
      "0.64 0.46 0.32 rg BT /F1 22 Tf 45 791 Td (MyARI) Tj ET\n0.16 0.14 0.12 rg BT /F1 10 Tf 14 TL 45 757 Td ";
    page.forEach((line, i) => {
      stream += `${i ? "T* " : ""}(${escape(line)}) Tj\n`;
    });
    stream += `ET BT /F1 9 Tf 45 35 Td (Financing & Closing Studio | Estimate | Page ${index + 1} of ${pages.length}) Tj ET`;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`,
    );
    objects.push(
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  let pdf = "%PDF-1.4\n",
    offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((o) => {
    pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
export function reportSvg(lines: string[]) {
  const esc = (x: string) =>
    x.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const wrapped = wrap(lines, 95);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${150 + wrapped.length * 24}"><rect width="100%" height="100%" fill="#f8f5ef"/><text x="45" y="60" font-family="Georgia,serif" font-size="34" fill="#a77b58">MyARI</text>${wrapped.map((l, i) => `<text x="45" y="${115 + i * 24}" font-family="Arial,sans-serif" font-size="15" fill="#292520">${esc(l)}</text>`).join("")}</svg>`;
}
export function downloadReport(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
