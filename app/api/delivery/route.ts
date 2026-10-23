import { z } from "zod";
import { apiOk, apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { readDelivery } from "@/lib/delivery/store";
import { queryDelivery } from "@/lib/delivery/query";
import { summarizeDelivery } from "@/lib/delivery/metrics";
const Query = z.object({
  id: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  campaign: z.string().max(100).optional(),
  contact: z.string().uuid().optional(),
  channel: z.enum(["sms", "email", "voicemail"]).optional(),
  status: z
    .enum([
      "pending",
      "queued",
      "submitted",
      "accepted",
      "sent",
      "delivered",
      "failed",
      "undelivered",
      "bounced",
      "rejected",
      "unknown",
    ])
    .optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  sort: z
    .enum(["created", "sent", "delivered", "contact", "status"])
    .optional(),
  direction: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});
export const GET = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const params = Query.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  if (params.from && params.to && params.from >= params.to)
    return apiError("Choose an end date after the start date.", {
      status: 400,
    });
  try {
    const snapshot = await readDelivery(owner);
    if (params.id) {
      const record = snapshot.records.find((r) => r.id === params.id);
      if (!record) return apiError("Message not found", { status: 404 });
      return apiOk({
        record,
        attempts: snapshot.records
          .filter(
            (r) =>
              r.logical_key === record.logical_key &&
              r.channel === record.channel,
          )
          .map((r) => ({
            id: r.id,
            status: r.status,
            created_at: r.created_at,
            provider_message_id: r.provider_message_id,
          })),
        health: snapshot.health.find((h) => h.channel === record.channel),
      });
    }
    const result = queryDelivery(snapshot.records, params);
    return apiOk({
      records: result.rows.map(
        ({ body: _body, subject: _subject, events: _events, ...row }) => row,
      ),
      page: result.page,
      pages: result.pages,
      total: result.total,
      metrics: summarizeDelivery(result.matching),
      health: snapshot.health,
      coverage: snapshot.coverage,
      canReconcile: process.env.ALLOW_DELIVERY_RECONCILIATION === "true",
      options: {
        campaigns: [
          ...new Map(
            snapshot.records
              .filter((r) => r.campaign_id)
              .map((r) => [
                r.campaign_id!,
                { id: r.campaign_id!, name: r.campaign },
              ]),
          ).values(),
        ],
        contacts: [
          ...new Map(
            snapshot.records
              .filter((r) => r.contact_id)
              .map((r) => [
                r.contact_id!,
                { id: r.contact_id!, name: r.contact },
              ]),
          ).values(),
        ],
      },
    });
  } catch {
    return apiError(
      "Delivery evidence is unavailable. Tracking may need configuration; historical delivery has not been verified.",
      { status: 503 },
    );
  }
});
