import { z } from "zod";
import { apiOk } from "@/lib/api-response";
import { conciergeHandler, ConciergeError, ids, jsonBody, staffRole } from "@/lib/concierge/access";
import { loadCase, mutate } from "@/lib/concierge/store";
import { readiness } from "@/lib/concierge/readiness";
import { caseFacts } from "@/lib/concierge/status";

export const POST = conciergeHandler(async (request, actor) => {
  const role = staffRole(actor);
  if (role !== "admin" && role !== "manager") throw new ConciergeError("Manager review is required.", 403);
  const b = z.object({ owner: z.string().min(1).max(100), version: z.number().int().min(0), requestId: z.string().uuid(), confirmed: z.literal(true), note: z.string().trim().min(10).max(1000), voice: z.enum(["not_required", "manually_verified"]) }).strict().parse(await jsonBody(request));
  if (!ids(process.env.CONCIERGE_OWNER_IDS).includes(b.owner)) throw new ConciergeError("Case is outside the eligible scope.", 404);
  if (b.owner === actor) throw new ConciergeError("A different authorized manager must review this case.", 403);
  const record = await loadCase(b.owner);
  if (!record) throw new ConciergeError("Case not found.", 404);
  if (record.version !== b.version) throw new ConciergeError("Reload the case before reviewing it.", 409);
  const status = await caseFacts(b.owner);
  if (!readiness(record, status.facts).ready) throw new ConciergeError("Complete subscriber readiness checks before staff signoff.", 409);
  if (record.discovery.channels.includes("voicemail") && b.voice !== "manually_verified") throw new ConciergeError("Review the existing Voice Studio recording and provider manually first.");
  const result = await mutate(b.owner, actor, b.requestId, b.version, { milestones: { staffReview: { actor, reviewedVersion: b.version + 1, reviewedAt: new Date().toISOString(), note: b.note, voice: b.voice } } }, "STAFF_READINESS_SIGNED");
  return apiOk({ approved: true, version: result.version, message: "Staff review recorded. This does not enable sending or activate campaigns." });
}, true);
