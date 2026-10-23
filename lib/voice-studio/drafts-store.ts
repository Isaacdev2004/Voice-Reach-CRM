import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DRAFT_DOCUMENT_ACTION, VoiceDraftSchema, sameVoiceDraft, type VoiceDraft, type VoiceDraftSave } from "./drafts";

const missingSchema = (code?: string) => ["42P01","PGRST205","42703","PGRST204"].includes(code ?? "");
export class VoiceDraftConflict extends Error {}
type Row = Record<string, unknown>;
function primaryDraft(row: Row): VoiceDraft {
  return VoiceDraftSchema.parse({...row,revision:row.updated_at});
}
function recoveryDraft(row: Row): VoiceDraft {
  return VoiceDraftSchema.parse({...(row.metadata as Row),id:row.id});
}
async function readRows(table:string, owner:string, document=false):Promise<Row[] | null> {
  const rows:Row[]=[];
  for(let offset=0;;offset+=500){
    let q=supabaseAdmin.from(table).select("*").eq("owner_id",owner).order("id",{ascending:true}).range(offset,offset+499);
    if(document)q=q.eq("action",DRAFT_DOCUMENT_ACTION);
    const result=await q;
    if(result.error){if(!document && missingSchema(result.error.code))return null;throw Error("DRAFT_UNAVAILABLE");}
    const batch=result.data ?? [];rows.push(...batch);if(batch.length<500)return rows;
  }
}
export async function readVoiceDrafts(owner:string) {
  // Existing private audit documents keep draft storage usable on installations
  // awaiting the optional voice_script_drafts migration. Never fall back for
  // network or permission failures and never hide fallback documents after migration.
  const [table,documents]=await Promise.all([readRows("voice_script_drafts",owner),readRows("audit_logs",owner,true)]);
  const drafts=new Map<string,VoiceDraft>();
  for(const row of table ?? []){const draft=primaryDraft(row);drafts.set(draft.id,draft);}
  for(const row of documents ?? []){const draft=recoveryDraft(row);if(drafts.has(draft.id))throw Error("DRAFT_STORAGE_CONFLICT");drafts.set(draft.id,draft);}
  return {drafts:[...drafts.values()].sort((a,b)=>b.updated_at.localeCompare(a.updated_at)),storage:table===null?"private_documents":"voice_script_drafts"};
}
export async function saveVoiceDraft(owner:string, body:VoiceDraftSave):Promise<VoiceDraft> {
  const legacy=await supabaseAdmin.from("audit_logs").select("id,metadata").eq("owner_id",owner).eq("action",DRAFT_DOCUMENT_ACTION).eq("id",body.id).maybeSingle();
  if(legacy.error)throw Error("DRAFT_UNAVAILABLE");
  const table=await supabaseAdmin.from("voice_script_drafts").select("*").eq("owner_id",owner).eq("id",body.id).maybeSingle();
  if(table.error && !missingSchema(table.error.code))throw Error("DRAFT_UNAVAILABLE");
  if(legacy.data && table.data)throw new VoiceDraftConflict();
  const document=Boolean(legacy.data) || Boolean(table.error);
  const current=legacy.data?recoveryDraft(legacy.data):table.data?primaryDraft(table.data):null;
  if(current && sameVoiceDraft(current,body))return current; // Lost response retries are safe.
  if((current?.revision ?? null)!==body.expectedRevision)throw new VoiceDraftConflict();
  const updated_at=new Date(Math.max(Date.now(),Date.parse(current?.updated_at ?? "")+1 || 0)).toISOString();
  const {expectedRevision:_,...fields}=body;
  const revision=document?crypto.randomUUID():updated_at;
  const draft={...fields,revision,updated_at};
  const row:Record<string,unknown>=document?{id:body.id,owner_id:owner,action:DRAFT_DOCUMENT_ACTION,entity_type:"voice_script_draft",entity_id:body.id,metadata:draft}:{...fields,owner_id:owner,updated_at};
  let result;
  if(current){
    let q=supabaseAdmin.from(document?"audit_logs":"voice_script_drafts").update(row).eq("owner_id",owner).eq("id",body.id);
    q=document?q.eq("action",DRAFT_DOCUMENT_ACTION).eq("metadata->>revision",body.expectedRevision):q.eq("updated_at",body.expectedRevision);
    result=await q.select("*").maybeSingle();
  }else result=await supabaseAdmin.from(document?"audit_logs":"voice_script_drafts").insert(row).select("*").single();
  if(result.error?.code==="23505" || (!result.error && !result.data))throw new VoiceDraftConflict();
  if(result.error)throw Error("DRAFT_UNAVAILABLE");
  const saved=document?recoveryDraft(result.data):primaryDraft(result.data);
  if(!sameVoiceDraft(saved,body))throw Error("DRAFT_UNAVAILABLE");
  return saved;
}
