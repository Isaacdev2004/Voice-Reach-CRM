import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stableRecordId } from "@/lib/reviews/store";
import type { Proposal } from "./schema";
export class AssistantFailure extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export type Entry = {
  id: string;
  entity_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
};
export async function entries(
  owner: string,
  type: string,
  entity?: string,
  limit = 50,
): Promise<Entry[]> {
  let q = supabaseAdmin
    .from("audit_logs")
    .select("id,entity_id,created_at,metadata")
    .eq("owner_id", owner)
    .eq("entity_type", `assistant_${type}`)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (entity) q = q.eq("entity_id", entity);
  const r = await q;
  if (r.error)
    throw new AssistantFailure("Assistant history is unavailable", 503);
  return r.data ?? [];
}
export async function put(
  owner: string,
  type: string,
  entity: string,
  key: string,
  metadata: Record<string, unknown>,
) {
  const id = stableRecordId(owner, `assistant_${type}`, entity, key);
  const r = await supabaseAdmin.from("audit_logs").insert({
    id,
    owner_id: owner,
    entity_type: `assistant_${type}`,
    entity_id: entity,
    action: `ASSISTANT_${type.toUpperCase()}`,
    metadata,
  });
  if (r.error?.code === "23505") return false;
  if (r.error)
    throw new AssistantFailure(
      "Assistant storage is unavailable; no action was authorized",
      503,
    );
  return true;
}
export async function getProposal(
  owner: string,
  id: string,
): Promise<Proposal> {
  const rows = await entries(owner, "proposal", id, 1);
  if (!rows[0]) throw new AssistantFailure("Proposal not found", 404);
  return rows[0].metadata as unknown as Proposal;
}
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
/** Fixed owner/day slots, enforced by unique PK. Concurrency cannot exceed the configured hard cap. */
export async function reserveUsage(
  owner: string,
  requestId: string,
  now = new Date(),
) {
  const day = now.toISOString().slice(0, 10),
    period = stableRecordId(owner, "assistant-usage", day),
    rows = await entries(owner, "usage", period, 101);
  if (rows.some((r) => r.metadata.requestId === requestId))
    throw new AssistantFailure(
      "This request was already submitted. Reload conversation history before retrying.",
      409,
    );
  const cap = Math.max(
    1,
    Math.min(100, Number(process.env.ASSISTANT_DAILY_REQUEST_LIMIT) || 30),
  );
  for (let slot = rows.length; slot < cap; slot++)
    if (
      await put(owner, "usage", period, String(slot), { requestId, day, slot })
    )
      return;
  throw new AssistantFailure("Daily assistant request limit reached", 429);
}
export async function takeTurn(
  owner: string,
  conversation: string,
  requestId: string,
) {
  const rows = await entries(owner, "turn", conversation, 50);
  const sequence = rows[0]?.id ?? "initial";
  const started = rows.find(
    (r) =>
      r.metadata.state === "started" &&
      !rows.some(
        (f) =>
          f.metadata.requestId === r.metadata.requestId &&
          f.metadata.state === "finished",
      ),
  );
  if (started && Date.now() - Date.parse(started.created_at) < 120000)
    throw new AssistantFailure(
      "A conversation response is already being prepared",
      409,
    );
  if (
    !(await put(owner, "turn", conversation, String(sequence), {
      requestId,
      state: "started",
    }))
  )
    throw new AssistantFailure(
      "Conversation changed; retry after loading history",
      409,
    );
}
export async function reserveProviderCall(owner: string, requestId: string) {
  const period = stableRecordId(
      owner,
      "assistant-calls",
      new Date().toISOString().slice(0, 10),
    ),
    used = await entries(owner, "call_budget", period, 101),
    cap = Math.max(
      1,
      Math.min(100, Number(process.env.ASSISTANT_DAILY_CALL_LIMIT) || 40),
    );
  for (let slot = used.length; slot < cap; slot++)
    if (
      await put(owner, "call_budget", period, String(slot), { requestId, slot })
    )
      return;
  throw new AssistantFailure("Daily AI provider-call limit reached", 429);
}
export function tokenCost(input: number, output: number) {
  const a = Number(process.env.ASSISTANT_INPUT_USD_PER_MILLION),
    b = Number(process.env.ASSISTANT_OUTPUT_USD_PER_MILLION);
  return Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0
    ? (input * a + output * b) / 1e6
    : null;
}
export async function checkObservedBudget(owner: string) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "assistant_tokens")
    .gte("created_at", since.toISOString())
    .limit(401);
  if (r.error)
    throw new AssistantFailure("Usage budget could not be verified", 503);
  const tokens = (r.data ?? []).reduce(
    (n, row) =>
      n +
      Number(row.metadata?.inputTokens ?? 0) +
      Number(row.metadata?.outputTokens ?? 0),
    0,
  );
  if (
    tokens >=
    Math.max(
      2000,
      Number(process.env.ASSISTANT_DAILY_TOKEN_THRESHOLD) || 100000,
    )
  )
    throw new AssistantFailure("Daily observed token threshold reached", 429);
  const budget = Number(process.env.ASSISTANT_DAILY_USD_THRESHOLD);
  if (
    budget > 0 &&
    process.env.ASSISTANT_HARD_COST_POLICY_APPROVED === "true"
  ) {
    if (tokenCost(1, 1) === null)
      throw new AssistantFailure(
        "Configure verified per-model token rates before using a dollar threshold",
        503,
      );
    const spent = (r.data ?? []).reduce(
      (n, row) =>
        n +
        (tokenCost(
          Number(row.metadata?.inputTokens ?? 0),
          Number(row.metadata?.outputTokens ?? 0),
        ) ?? 0),
      0,
    );
    if (spent >= budget)
      throw new AssistantFailure("Daily estimated cost threshold reached", 429);
  }
}
export async function reserveMinute(owner: string, requestId: string) {
  const period = stableRecordId(
      owner,
      "assistant-minute",
      new Date().toISOString().slice(0, 16),
    ),
    used = await entries(owner, "minute", period, 6);
  for (let slot = used.length; slot < 5; slot++)
    if (await put(owner, "minute", period, String(slot), { requestId })) return;
  throw new AssistantFailure(
    "Please wait before sending more assistant requests",
    429,
  );
}
