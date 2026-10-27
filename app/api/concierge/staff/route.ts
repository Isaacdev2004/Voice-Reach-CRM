import { z } from "zod";
import { conciergeAnalytics } from "@/lib/concierge/analytics";
import { apiOk } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  conciergeHandler,
  staffRole,
  ConciergeError,
  jsonBody,
  ids,
} from "@/lib/concierge/access";
import { mutate } from "@/lib/concierge/store";
import { readiness, suggestedCommunications } from "@/lib/concierge/readiness";
import { caseFacts } from "@/lib/concierge/status";
import type { CaseRecord } from "@/lib/concierge/schema";
const ownerList = () => ids(process.env.CONCIERGE_OWNER_IDS);
export const GET = conciergeHandler(async (request, actor) => {
  const role = staffRole(actor)!;
  // Assigned case scope is mandatory for specialists and sales. Sales only receive operational status.
  let query = supabaseAdmin
    .from("concierge_cases")
    .select(
      role === "sales"
        ? "owner_id,stage,updated_at,next_followup,assignee_id"
        : "*",
    )
    .in("owner_id", ownerList())
    .order("updated_at", { ascending: true })
    .limit(100);
  if (role === "specialist" || role === "sales")
    query = query.eq("assignee_id", actor);
  const r = await query;
  if (r.error) throw r.error;
  const records = r.data as unknown as CaseRecord[];
  await writeAuditLog({
    ownerId: actor,
    action: "CONCIERGE_STAFF_CASES_READ",
    entityType: "concierge",
    metadata: { role, count: records.length },
  });
  const details =
    role === "sales"
      ? []
      : await Promise.all(
          records.map(async (c) => {
            const status = await caseFacts(c.owner_id);
            return {
              owner: c.owner_id,
              subscription: status.subscription,
              facts: status.facts,
              readiness: readiness(c as CaseRecord, status.facts),
              drafts: suggestedCommunications(c as CaseRecord, status.facts),
            };
          }),
        );
  const cases = records.map((c) =>
    role === "sales"
      ? {
          owner_id: c.owner_id,
          stage: c.stage,
          updated_at: c.updated_at,
          next_followup: c.next_followup,
        }
      : {
          ...c,
          readiness: details.find((d) => d.owner === c.owner_id)?.readiness,
          subscription: details.find((d) => d.owner === c.owner_id)
            ?.subscription,
        },
  );
  const counts: Record<string, number> = {};
  for (const c of cases) counts[c.stage] = (counts[c.stage] ?? 0) + 1;
  const oldest = cases.filter(
    (c) =>
      c.stage !== "ready" &&
      Date.now() - new Date(c.updated_at).getTime() > 7 * 86400000,
  ).length;
  const recorded =
    role === "sales" || !records.length
      ? { data: [], error: null }
      : await supabaseAdmin
          .from("concierge_events")
          .select("owner_id,action,created_at")
          .in(
            "owner_id",
            records.map((c) => c.owner_id),
          )
          .order("created_at", { ascending: true })
          .limit(5000);
  if (recorded.error) throw recorded.error;
  return apiOk({
    role,
    cases,
    analytics:
      role === "sales"
        ? null
        : conciergeAnalytics(
            records,
            new Map(details.map((d) => [d.owner, d.facts])),
            recorded.data,
          ),
    metrics: {
      scopedCases: cases.length,
      byStage: counts,
      needsAttention: oldest,
      coverage:
        "Current eligible case sample, up to 100; no historical registration or conversion denominator.",
    },
    communicationDrafts: details.flatMap((d) =>
      d.drafts.map((draft) => ({ ...draft, caseReference: d.owner })),
    ),
    trainingScheduling:
      "Use an existing authorized calendar workflow; no booking or invitation is sent here.",
  });
}, true);
export const POST = conciergeHandler(async (request, actor) => {
  const role = staffRole(actor)!;
  if (role === "sales")
    throw new ConciergeError("Sales partners have status-only access.", 403);
  const b = z
    .object({
      owner: z.string().min(1).max(100),
      requestId: z.string().uuid(),
      version: z.number().int().min(0),
      stage: z
        .enum([
          "discovery",
          "migration",
          "campaigns",
          "review",
          "training",
          "ready",
          "needs_attention",
        ])
        .optional(),
      assignee: z.string().max(100).nullable().optional(),
      internalNote: z.string().trim().max(3000).optional(),
      nextFollowup: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable()
        .optional(),
    })
    .strict()
    .parse(await jsonBody(request));
  if (!ownerList().includes(b.owner))
    throw new ConciergeError("Case is outside the eligible scope.", 404);
  const current = await supabaseAdmin
    .from("concierge_cases")
    .select("owner_id,assignee_id")
    .eq("owner_id", b.owner)
    .maybeSingle();
  if (current.error) throw current.error;
  if (
    !current.data ||
    (role === "specialist" && current.data.assignee_id !== actor)
  )
    throw new ConciergeError("Case not found in your assignment scope.", 404);
  if (b.assignee !== undefined && role !== "admin" && role !== "manager")
    throw new ConciergeError("Only managers can assign cases.", 403);
  if (b.assignee && !staffRole(b.assignee))
    throw new ConciergeError("Choose an authorized staff member.");
  const patch = {
    ...(b.stage ? { stage: b.stage } : {}),
    ...(b.assignee !== undefined ? { assignee_id: b.assignee } : {}),
    ...(b.internalNote !== undefined ? { internal_note: b.internalNote } : {}),
    ...(b.nextFollowup !== undefined ? { next_followup: b.nextFollowup } : {}),
  };
  return apiOk({
    record: await mutate(
      b.owner,
      actor,
      b.requestId,
      b.version,
      patch,
      "STAFF_CASE_UPDATED",
    ),
  });
}, true);
