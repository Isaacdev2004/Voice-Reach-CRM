import { z } from "zod";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
const action="VOICE_TRANSCRIPT_REVIEWED";
async function authorized(owner:string,id:string){const r=await supabaseAdmin.from("voice_assets").select("id").eq("owner_id",owner).eq("id",id).maybeSingle();if(r.error)throw Error();return Boolean(r.data);}
export const GET=withApiHandler(async request=>{
  const owner=await requireUserId(),id=new URL(request.url).searchParams.get("assetId");
  if(!z.string().uuid().safeParse(id).success)return apiError("Select a recording.",{status:400});
  try{if(!await authorized(owner,id!))return apiError("Recording not found.",{status:404});
    const r=await supabaseAdmin.from("audit_logs").select("id,metadata,created_at").eq("owner_id",owner).eq("action",action).eq("entity_id",id).order("created_at",{ascending:false}).limit(1);
    if(r.error)throw Error();const row=r.data?.[0];return apiOk({review:row?{id:row.id,text:row.metadata.transcript,reviewedAt:row.created_at}:null});
  }catch{return apiError("Reviewed transcript could not be loaded.",{status:503});}
});
export const POST=withApiHandler(async request=>{
  const owner=await requireUserId(),parsed=z.object({voiceAssetId:z.string().uuid(),transcript:z.string().trim().min(1).max(5000),reviewed:z.literal(true)}).strict().safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("Review a transcript of 1–5,000 characters and confirm your review.",{status:400});
  try{if(!await authorized(owner,parsed.data.voiceAssetId))return apiError("Recording not found.",{status:404});
    const r=await supabaseAdmin.from("audit_logs").insert({owner_id:owner,action,entity_type:"voice_asset",entity_id:parsed.data.voiceAssetId,metadata:{transcript:parsed.data.transcript,source:"agent_reviewed"}}).select("id,created_at").single();
    if(r.error || !r.data)throw Error();return apiOk({review:{id:r.data.id,text:parsed.data.transcript,reviewedAt:r.data.created_at}});
  }catch{return apiError("Reviewed transcript was not saved. Keep your text and retry.",{status:503});}
});
