import sharp from "sharp";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedBrandPath, imageFileValid } from "@/lib/settings/brand-kit";
import type { Proposal } from "./schema";
import { AssistantFailure } from "./store";
const esc = (s: unknown) =>
  String(s ?? "").replace(
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
function lines(text: unknown, max = 65) {
  const words = String(text ?? "").split(/\s+/),
    out: string[] = [];
  for (const word of words) {
    if (!out.length || out.at(-1)!.length + word.length + 1 > max)
      out.push(word);
    else out[out.length - 1] += " " + word;
  }
  return out;
}
async function image(owner: string, path: string) {
  if (!path) return "";
  if (!ownedBrandPath(owner, path))
    throw new AssistantFailure("Brand image is unauthorized", 403);
  const r = await supabaseAdmin.storage
    .from(process.env.BRAND_STORAGE_BUCKET || "brand-assets")
    .download(path);
  if (r.error || !r.data)
    throw new AssistantFailure(
      "An approved Brand Kit image is unavailable",
      503,
    );
  if (r.data.size > 4 * 1024 * 1024)
    throw new AssistantFailure("Brand image exceeds the safe limit", 400);
  const bytes = new Uint8Array(await r.data.arrayBuffer());
  const mime = path.endsWith(".png")
    ? "image/png"
    : path.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
  if (!imageFileValid(mime, bytes))
    throw new AssistantFailure("Brand image encoding is invalid", 400);
  const png = await sharp(bytes, { limitInputPixels: 40000000 })
    .resize(420, 420, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}
export async function flyerSvg(owner: string, proposal: Proposal) {
  if (proposal.action.kind !== "flyer")
    throw new AssistantFailure("Choose a flyer proposal", 400);
  const p = proposal.preview,
    b = p.brand as Record<string, unknown>;
  const [logo, headshot] = await Promise.all([
    image(owner, String(b.logoPath ?? "")),
    image(
      owner,
      proposal.action.includeHeadshot ? String(b.headshotPath ?? "") : "",
    ),
  ]);
  const selectedColor = proposal.action.accentColor ?? b.primaryColor;
  const color = /^#[a-f\d]{6}$/i.test(String(selectedColor))
    ? String(selectedColor)
    : "#A77B58";
  const text = (
    value: unknown,
    x: number,
    y: number,
    size: number,
    max = 65,
    fill = "#292520",
  ) =>
    lines(value, max)
      .map(
        (line, i) =>
          `<text x="${x}" y="${y + i * (size + 12)}" font-family="Georgia,serif" font-size="${size}" fill="${fill}">${esc(line)}</text>`,
      )
      .join("");
  const contacts = [
    b.agentName,
    b.jobTitle,
    b.businessName,
    b.phone,
    b.email,
    b.website,
    b.licenseNumber,
  ]
    .filter(Boolean)
    .join(" · ");
  const partners = (
    p.partners as { name: string; phone?: string; email?: string }[]
  )
    .map((x) => [x.name, x.phone, x.email].filter(Boolean).join(" · "))
    .join(" | ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="#F8F5EF"/><rect x="40" y="40" width="1120" height="1520" rx="28" fill="#fffdf9" stroke="#dfd1c1"/><rect x="80" y="90" width="1040" height="8" fill="${color}"/>${logo ? `<image href="${logo}" x="80" y="130" width="280" height="160" preserveAspectRatio="xMinYMid meet"/>` : text(b.businessName, 80, 190, 35, 45)}<text x="80" y="350" font-family="Arial,sans-serif" font-size="20" letter-spacing="4" fill="${color}">${proposal.action.layout === "minimal" ? "PROPERTY DETAILS · DRAFT" : "PROPERTY PRESENTATION · DRAFT"}</text>${text(p.headline, 80, 425, 48, 35)}${text(p.address, 80, 575, 32, 53)}${p.price ? text(new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(p.price)), 80, 710, 52) : text("Price not supplied", 80, 710, 26)}${text(p.description, 80, 820, 26, 68)}<line x1="80" y1="1190" x2="1120" y2="1190" stroke="#dfd1c1"/>${headshot ? `<image href="${headshot}" x="80" y="1230" width="150" height="150" preserveAspectRatio="xMidYMid meet"/>` : ""}${text(contacts, headshot ? 260 : 80, 1245, 21, headshot ? 69 : 86)}${text(partners, 80, 1425, 16, 105)}${text(b.disclosures, 80, 1480, 14, 125)}<text x="80" y="1540" font-family="Arial,sans-serif" font-size="13" fill="#76695d">Subscriber-maintained property facts. Review listing rights, price and disclosures before sharing.</text></svg>`;
}
/** Binary-safe single-page PDF with a deterministic rendered image. No generated pricing/text layer. */
export function imagePdf(jpeg: Buffer) {
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>",
    ),
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width 1200 /Height 1600 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      Buffer.from("\nendstream"),
    ]),
  ];
  const stream = "q\n600 0 0 800 0 0 cm\n/Im0 Do\nQ";
  objects.push(
    Buffer.from(
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    ),
  );
  const parts = [Buffer.from("%PDF-1.4\n")],
    offsets = [0];
  let length = parts[0].length;
  objects.forEach((obj, i) => {
    offsets.push(length);
    const b = Buffer.concat([
      Buffer.from(`${i + 1} 0 obj\n`),
      obj,
      Buffer.from("\nendobj\n"),
    ]);
    parts.push(b);
    length += b.length;
  });
  const xref = length;
  parts.push(
    Buffer.from(
      `xref\n0 6\n0000000000 65535 f \n${offsets
        .slice(1)
        .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
        .join(
          "",
        )}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`,
    ),
  );
  return Buffer.concat(parts);
}
