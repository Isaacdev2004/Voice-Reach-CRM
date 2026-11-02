import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { automaticTraffic, DISCLOSURE_VERSION, opaque, ownerEnabled, publicEnabled, tokenHash, validToken } from "@/lib/property-interest/model";
import { body, response } from "@/lib/property-interest/http";

export async function POST(request: Request) {
  if (!publicEnabled()) return response({error:"Not available"},404);
  try {
    const input = await body(request);
    if(!validToken(input.token)) return response({error:"Link unavailable"},404);
    const hash=tokenHash(input.token);
    const jar=await cookies();
    const cookie="pi_" + hash.slice(0,16);
    const options={httpOnly:true,secure:true,sameSite:"strict" as const,path:"/api/property-interest/public",maxAge:7200};
    if(input.action === "stop") {
      const session=jar.get(cookie)?.value;
      if(validToken(session)) await supabaseAdmin.from("property_interest_sessions").update({revoked_at:new Date().toISOString()})
        .eq("session_hash",tokenHash(session)).eq("share_hash",hash);
      jar.set(cookie,"",{...options,maxAge:0});
      jar.set("pi_declined","1",{...options,maxAge:31536000});
      return response({stopped:true});
    }
    const {data:share,error} = await supabaseAdmin.from("property_interest_shares")
      .select("id,owner_id,label,zillow_url,expires_at,revoked_at").eq("capability_hash",hash).maybeSingle();
    if(error || !share || !ownerEnabled(share.owner_id) || share.revoked_at || Date.parse(share.expires_at)<=Date.now()) return response({error:"Link unavailable"},404);
    if(input.action === "resolve") return response({label:share.label,url:share.zillow_url,disclosure:DISCLOSURE_VERSION});
    if(automaticTraffic(request.headers) || jar.get("pi_declined")?.value === "1")
      return response({error:"Tracking is disabled. You can still view without tracking."},403);
    if(input.action === "consent") {
      if(input.disclosure !== DISCLOSURE_VERSION || input.agree !== true) return response({error:"Tracking choice required"},400);
      const session=opaque();
      const {error:e} = await supabaseAdmin.rpc("start_property_interest_session",{
        p_share_hash:hash,p_session_hash:tokenHash(session),p_disclosure:DISCLOSURE_VERSION,
      });
      if(e) return response({error:"Tracking is unavailable; view without tracking."},409);
      jar.set(cookie,session,options);
      return response({readyAfterSeconds:15});
    }
    if(input.action === "qualify") {
      const session=jar.get(cookie)?.value;
      if(!validToken(session) || input.interacted !== true || input.visible !== true)
        return response({error:"Open the page and confirm your tracking choice."},403);
      const {data,error:e} = await supabaseAdmin.rpc("record_property_interest_visit",{
        p_share_hash:hash,p_session_hash:tokenHash(session),
      });
      if(e) return response({error:"Visit could not be recorded; no communication was sent."},409);
      return response({result:data});
    }
    return response({error:"Invalid request"},400);
  } catch { return response({error:"Unable to process this request"},400); }
}
