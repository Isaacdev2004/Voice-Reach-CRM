import { renderAiDocument } from "@/lib/billing/ai/meter";
import sharp from "sharp";
import { z } from "zod";
import { assistantHandler } from "@/lib/assistant/api";
import { getProposal } from "@/lib/assistant/store";
import { flyerSvg, imagePdf } from "@/lib/assistant/flyer";
export const GET = assistantHandler(async (request, owner) => {
  const q = new URL(request.url).searchParams,
    id = z.string().uuid().parse(q.get("id")),
    format = z
      .enum(["svg", "png", "pdf", "json"])
      .parse(q.get("format") ?? "png"),
    p = await getProposal(owner, id);
  if (p.action.kind !== "flyer")
    return new Response("Flyer not found", { status: 404 });
  let body: Uint8Array | string, mime: string;
  if (format === "json") {
    body = JSON.stringify({ action: p.action, preview: p.preview }, null, 2);
    mime = "application/json";
  } else {
    const rendered = await renderAiDocument(owner, p, async () => {
      const svg = await flyerSvg(owner, p);
      if (format === "svg") {
        return { body: svg, mime: "image/svg+xml" };
      } else if (format === "png") {
        return {
          body: new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer()),
          mime: "image/png",
        };
      } else {
        const jpeg = await sharp(Buffer.from(svg))
          .flatten({ background: "#fffdf9" })
          .jpeg({ quality: 95 })
          .toBuffer();
        return {
          body: new Uint8Array(imagePdf(jpeg)),
          mime: "application/pdf",
        };
      }
    });
    body = rendered.body;
    mime = rendered.mime;
  }
  return new Response(
    typeof body === "string" ? body : new Uint8Array(body).buffer,
    {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${format === "png" ? "inline" : "attachment"}; filename="myari-flyer-draft.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src data:; sandbox",
      },
    },
  );
});
