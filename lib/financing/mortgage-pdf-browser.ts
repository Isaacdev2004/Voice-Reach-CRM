import { MortgagePdfPreferencesSchema } from "./pdf-preferences";
import type { MortgagePdfInput } from "./mortgage-pdf-model";
import type { MortgagePdfAssets } from "./mortgage-pdf";
const files = {
  serif: "serif-400.ttf",
  serifBold: "serif-600.ttf",
  sans: "sans-400.ttf",
  sansBold: "sans-600.ttf",
  architecture: "financing-architecture.jpg",
};
async function bytes(url: string) {
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok)
    throw Error("PDF asset unavailable. Retry when your connection is stable.");
  const b = new Uint8Array(await r.arrayBuffer());
  if (b.byteLength > 5000000) throw Error("PDF image is too large.");
  return b;
}
async function optionalImage(url?: string) {
  if (!url || !url.startsWith("https://")) return undefined;
  try {
    const raw = await bytes(url);
    if (raw[0] === 137 || raw[0] === 255) return raw;
    const blob = new Blob([raw.buffer as ArrayBuffer]);
    const image = await createImageBitmap(blob);
    const canvas = document.createElement("canvas"),
      scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    canvas.width = Math.ceil(image.width * scale);
    canvas.height = Math.ceil(image.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    return png ? new Uint8Array(await png.arrayBuffer()) : undefined;
  } catch {
    return undefined;
  }
}
export async function mortgagePdfBrowser(input: MortgagePdfInput) {
  const preferences = MortgagePdfPreferencesSchema.parse(
    input.preferences ?? input.branding.pdfPreferences ?? {},
  );
  const entries = await Promise.all(
    Object.entries(files).map(
      async ([key, file]) => [key, await bytes("/brand/pdf/" + file)] as const,
    ),
  );
  const assets = Object.fromEntries(entries) as unknown as MortgagePdfAssets;
  assets.logo = await bytes("/brand/myari-logo.png");
  const lender = input.partners.find(
    (p) => p.id === input.context.lenderId && p.kind === "lender",
  );
  const [agentPhoto, agentLogo, lenderPhoto, lenderLogo] = await Promise.all([
    preferences.template !== "myari"
      ? optionalImage(input.branding.headshot)
      : undefined,
    preferences.template !== "myari"
      ? optionalImage(input.branding.logo)
      : undefined,
    preferences.template === "cobranded" && lender?.brandingAuthorized
      ? optionalImage(lender.headshotUrl)
      : undefined,
    preferences.template === "cobranded" && lender?.brandingAuthorized
      ? optionalImage(lender.logoUrl)
      : undefined,
  ]);
  Object.assign(assets, { agentPhoto, agentLogo, lenderPhoto, lenderLogo });
  const { generateMortgagePdf } = await import("./mortgage-pdf");
  const result = await generateMortgagePdf(input, assets);
  return {
    bytes: result,
    imageWarning:
      (preferences.template !== "myari" &&
        !!input.branding.headshot &&
        !agentPhoto) ||
      (preferences.template !== "myari" &&
        !!input.branding.logo &&
        !agentLogo) ||
      (preferences.template === "cobranded" &&
        !!lender?.brandingAuthorized &&
        !!lender.logoUrl &&
        !lenderLogo) ||
      (preferences.template === "cobranded" &&
        !!lender?.brandingAuthorized &&
        !!lender.headshotUrl &&
        !lenderPhoto)
        ? "Some authorized branding images could not be embedded. Review the PDF; contact text is preserved."
        : "",
  };
}
export function mortgagePdfFilename(input: MortgagePdfInput) {
  const who = input.client
    ? [input.client.first_name, input.client.last_name]
        .filter(Boolean)
        .join("-")
    : "mortgage";
  const date =
    input.context.preparedDate || new Date().toISOString().slice(0, 10);
  return (
    `myari-${who}-${date}-estimate`
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 140) + ".pdf"
  );
}
