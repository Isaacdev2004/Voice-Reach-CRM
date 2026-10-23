import { apiSuccess, apiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { financingHandler } from "@/lib/financing/api";
import { ReportSchema } from "@/lib/financing/schemas";
import { calculate, DISCLOSURE } from "@/lib/financing/calculators";
export const GET = financingHandler(async (request) => {
  const owner = await requireUserId(),
    contact = new URL(request.url).searchParams.get("contactId");
  let q = supabaseAdmin
    .from("financing_reports")
    .select("*")
    .eq("owner_id", owner);
  if (contact) q = q.eq("contact_id", contact);
  const r = await q.order("created_at", { ascending: false }).limit(100);
  if (r.error) throw r.error;
  return apiSuccess({ reports: r.data });
});
export const POST = financingHandler(async (request) => {
  const owner = await requireUserId(),
    body = ReportSchema.parse(await request.json());
  let clientSnapshot = null;
  for (const id of new Set(
    [body.context.contactId, body.context.propertyContactId].filter(Boolean),
  )) {
    const c = await supabaseAdmin
      .from("contacts")
      .select("id,property_address,first_name,last_name,email,phone")
      .eq("owner_id", owner)
      .eq("id", id!)
      .maybeSingle();
    if (c.error) throw c.error;
    if (id === body.context.contactId) clientSnapshot = c.data;
    if (
      !c.data ||
      (id === body.context.propertyContactId &&
        !c.data.property_address?.trim())
    )
      return apiError("Contact or saved property not found", { status: 404 });
  }
  const partners = [];
  for (const [id, kind] of [
    [body.context.lenderId, "lender"],
    [body.context.titleId, "title"],
  ] as const) {
    if (!id) continue;
    const p = await supabaseAdmin
      .from("financing_partners")
      .select("id,kind,payload")
      .eq("owner_id", owner)
      .eq("id", id)
      .eq("kind", kind)
      .maybeSingle();
    if (p.error) throw p.error;
    if (!p.data) return apiError("Partner not found", { status: 404 });
    partners.push(p.data);
  }
  const s = await loadSavedSettings(owner);
  const payload = {
    ...body,
    client: clientSnapshot,
    engineVersion: 1,
    result: calculate(body.calculation),
    disclosure: DISCLOSURE,
    partners,
    branding: {
      name: s?.profile.fullName ?? "",
      phone: s?.profile.phone ?? "",
      headshot: s?.profile.avatarUrl ?? "",
      brokerage: s?.workspace.name ?? "",
      jobTitle: s?.profile.jobTitle ?? "",
    },
  };
  const r = await supabaseAdmin.rpc("save_financing_report", {
    p_owner: owner,
    p_id: body.id,
    p_contact: body.context.contactId,
    p_payload: payload,
  });
  if (r.error?.message?.includes("NOT_FOUND"))
    return apiError("Related record not found", { status: 404 });
  if (r.error) throw r.error;
  return apiSuccess({ report: r.data });
});
