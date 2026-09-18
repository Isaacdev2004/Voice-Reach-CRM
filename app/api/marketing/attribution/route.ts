import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";

const BodySchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
  referrer: z.string().optional(),
  landing_path: z.string().optional(),
});

/** Store trial/signup attribution for launch scorecard (CAC by channel). */
export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = BodySchema.parse(await request.json());

  try {
    await writeAuditLog({
      ownerId,
      action: "MARKETING_ATTRIBUTION",
      entityType: "signup",
      metadata: { ...body, recorded_at: new Date().toISOString() },
    });
  } catch {
    return apiError("Could not save attribution", { status: 500 });
  }

  return apiOk({ saved: true });
});
