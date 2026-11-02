import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CreateShare, canonicalProperty, opaque, ownerEnabled, tokenHash } from "@/lib/property-interest/model";
import { body, response } from "@/lib/property-interest/http";

export async function GET() {
  try {
    const owner = await requireUserId();
    if (!ownerEnabled(owner)) return response({error:"Not available"},404);
    const {data,error} = await supabaseAdmin.from("property_interest_shares")
      .select("id,contact_id,property_key,label,zillow_url,window_days,created_at,expires_at,revoked_at")
      .eq("owner_id",owner).order("created_at",{ascending:false}).limit(100);
    const events = await supabaseAdmin.from("property_interest_events").select("id,share_id,created_at,qualified,reason")
      .eq("owner_id",owner).order("created_at",{ascending:false}).limit(200);
    const triggers = await supabaseAdmin.from("property_interest_triggers").select("contact_id,property_key,campaign_id,created_at")
      .eq("owner_id",owner);
    if(error || events.error || triggers.error) return response({error:"Interest history is unavailable."},503);
    return response({shares:data,events:events.data,triggers:triggers.data,identityAssurance:"recipient_link_only"});
  } catch { return response({error:"Sign in required"},401); }
}
export async function POST(request: Request) {
  try {
    const owner = await requireUserId();
    if (!ownerEnabled(owner)) return response({error:"Not available"},404);
    const input = CreateShare.parse(await body(request));
    const property = canonicalProperty(input.url);
    const token = opaque();
    const {data,error} = await supabaseAdmin.rpc("create_property_interest_share", {
      p_owner:owner,p_contact:input.contactId,p_property:property.propertyKey,p_url:property.url,
      p_label:input.label,p_days:input.windowDays,p_hash:tokenHash(token),
    });
    if(error) return response({error:"Unable to create link. Check ownership, contact suppression and staging database readiness."},409);
    return response({shareId:data,shareUrl:new URL("/property-interest",request.url).origin + "/property-interest#" + token,
      identityAssurance:"recipient_link_only",expiresInDays:30},201);
  } catch { return response({error:"Check your session, contact, property URL and window."},400); }
}
export async function DELETE(request: Request) {
  try {
    const owner = await requireUserId();
    if (!ownerEnabled(owner)) return response({error:"Not available"},404);
    const input = await body(request);
    if(typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) return response({error:"Invalid share"},400);
    const {data,error} = await supabaseAdmin.from("property_interest_shares").update({revoked_at:new Date().toISOString()})
      .eq("owner_id",owner).eq("id",input.id).select("id");
    if(error) return response({error:"Unable to revoke link"},503);
    return response({revoked:Boolean(data?.length)});
  } catch { return response({error:"Request not authorized"},403); }
}
