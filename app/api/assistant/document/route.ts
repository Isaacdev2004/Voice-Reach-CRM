import { renderAiDocument } from "@/lib/billing/ai/meter";
import { z } from "zod";
import sharp from "sharp";
import { assistantHandler } from "@/lib/assistant/api";
import { getProposal, AssistantFailure } from "@/lib/assistant/store";
import { calculate, DISCLOSURE, usd } from "@/lib/financing/calculators";
import { reportPdf, reportSvg } from "@/lib/financing/reports";
export const GET = assistantHandler(async (request, owner) => {
  const q = new URL(request.url).searchParams,
    id = z.string().uuid().parse(q.get("id")),
    format = z.enum(["pdf", "png"]).parse(q.get("format") ?? "pdf"),
    p = await getProposal(owner, id);
  if (p.action.kind !== "financing")
    throw new AssistantFailure("Choose a financing document proposal", 400);
  const r = calculate(p.action.calculation),
    lines = [
      r.title,
      "PRELIMINARY ESTIMATE — SUBSCRIBER-ENTERED ASSUMPTIONS",
      ...r.lines.map((l) => `${l.label}: ${usd(l.amount)}`),
      `${r.totalLabel}: ${usd(r.total)}`,
      ...r.details.map((d) => `${d.label}: ${d.value}`),
      DISCLOSURE,
    ];
  const bytes = await renderAiDocument(owner, p, async () =>
    format === "pdf"
      ? reportPdf(lines)
      : await sharp(Buffer.from(reportSvg(lines)))
          .png()
          .toBuffer(),
  );
  return new Response(new Uint8Array(bytes).buffer, {
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "image/png",
      "Content-Disposition": `attachment; filename="myari-financing-estimate.${format}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
