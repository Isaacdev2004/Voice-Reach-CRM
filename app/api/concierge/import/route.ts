import { z } from "zod";
import { apiOk } from "@/lib/api-response";
import { conciergeHandler, ConciergeError } from "@/lib/concierge/access";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prepareCsv, csvColumns } from "@/lib/concierge/import";
import { loadCase } from "@/lib/concierge/store";
import {
  assertCanAddContacts,
  resolveOwnerPlan,
} from "@/lib/billing/plan-limits";
const Confirm = z
  .object({
    action: z.enum(["confirm", "cancel"]),
    id: z.string().uuid(),
    confirmed: z.literal(true),
  })
  .strict();
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ConciergeError("Choose a CSV file.");
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3 * 1024 * 1024) {
      await reader.cancel();
      throw new ConciergeError("File is too large.", 413);
    }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    all.set(part, offset);
    offset += part.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all));
}
export const GET = conciergeHandler(async (request, owner) => {
  // On-demand retention cleanup, not a promised background job.
  const expired = await supabaseAdmin
    .from("concierge_imports")
    .update({ rows: [], state: "expired" })
    .eq("owner_id", owner)
    .eq("state", "preview")
    .lte("expires_at", new Date().toISOString());
  if (expired.error) throw expired.error;
  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const jobId = z.string().uuid().parse(id);
    const saved = await supabaseAdmin
      .from("concierge_imports")
      .select("id,state,expires_at,rows,row_errors")
      .eq("owner_id", owner)
      .eq("id", jobId)
      .eq("state", "preview")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (saved.error) throw saved.error;
    if (!saved.data)
      throw new ConciergeError("Import preview not found or expired.", 404);
    return apiOk({
      preview: {
        id: saved.data.id,
        state: saved.data.state,
        expires_at: saved.data.expires_at,
      },
      rows: saved.data.rows,
      errors: saved.data.row_errors,
    });
  }
  const r = await supabaseAdmin
    .from("concierge_imports")
    .select("id,state,result,created_at,expires_at,row_errors")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .limit(20);
  if (r.error) throw r.error;
  return apiOk({ imports: r.data });
});
export const POST = conciergeHandler(async (request, owner) => {
  const b = await body(request);
  if (b.action === "columns") {
    const input = z
      .object({ action: z.literal("columns"), csv: z.string() })
      .strict()
      .parse(b);
    return apiOk({ columns: csvColumns(input.csv).columns });
  }
  if (b.action === "preview") {
    const input = z
      .object({
        action: z.literal("preview"),
        csv: z.string(),
        mapping: z.unknown(),
        privacyConfirmed: z.literal(true),
      })
      .strict()
      .parse(b);
    if (!(await loadCase(owner)))
      throw new ConciergeError(
        "Save your business discovery before importing.",
      );
    const prepared = prepareCsv(input.csv, input.mapping);
    if (!prepared.rows.length)
      throw new ConciergeError(
        "No valid contacts found. Review the mapping and row errors.",
      );
    const capacity = await assertCanAddContacts(owner, prepared.rows.length);
    if (!capacity.ok) throw new ConciergeError(capacity.error, 403);
    const existing = await supabaseAdmin
      .from("concierge_imports")
      .select("id,state,result,expires_at")
      .eq("owner_id", owner)
      .eq("fingerprint", prepared.fingerprint)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data)
      return apiOk({
        preview: existing.data,
        rows: prepared.rows,
        errors: prepared.errors,
        message:
          existing.data.state === "preview"
            ? "Review this existing preview."
            : "This file was already processed or cancelled. Its existing summary is preserved.",
      });
    const r = await supabaseAdmin
      .from("concierge_imports")
      .insert({
        id: crypto.randomUUID(),
        owner_id: owner,
        fingerprint: prepared.fingerprint,
        rows: prepared.rows,
        row_errors: prepared.errors,
      })
      .select("id,state,expires_at")
      .single();
    if (r.error) throw r.error;
    // Duplicates against current CRM are identified now and rechecked atomically at execution.
    const contacts = await supabaseAdmin
      .from("contacts")
      .select("phone,email")
      .eq("owner_id", owner);
    if (contacts.error) throw contacts.error;
    const duplicates = prepared.rows.filter((row) =>
      contacts.data.some(
        (c) =>
          c.phone?.replace(/\D/g, "") === row.phone.replace(/\D/g, "") ||
          (row.email && c.email?.toLowerCase() === row.email),
      ),
    ).length;
    return apiOk({
      preview: r.data,
      rows: prepared.rows,
      errors: prepared.errors,
      existingDuplicates: duplicates,
    });
  }
  const confirm = Confirm.parse(b);
  if (confirm.action === "cancel") {
    const r = await supabaseAdmin
      .from("concierge_imports")
      .update({ state: "cancelled", rows: [] })
      .eq("owner_id", owner)
      .eq("id", confirm.id)
      .eq("state", "preview")
      .select("id");
    if (r.error) throw r.error;
    if (!r.data.length)
      throw new ConciergeError("Preview not found or already processed.", 409);
    return apiOk({ cancelled: true });
  }
  const plan = await resolveOwnerPlan(owner);
  const result = await supabaseAdmin.rpc("execute_concierge_import", {
    p_owner: owner,
    p_import: confirm.id,
    p_limit: plan.contactLimit,
  });
  if (result.error) {
    if (result.error.message.includes("CONTACT_PLAN_LIMIT"))
      throw new ConciergeError(
        "Your contact allowance changed. Nothing was imported; review your plan capacity.",
        409,
      );
    if (/NOT_FOUND|EXPIRED|CANCELLED/.test(result.error.message))
      throw new ConciergeError(
        "This import is unavailable or expired. Nothing was imported.",
        409,
      );
    throw result.error;
  }
  return apiOk({ result: result.data });
});
