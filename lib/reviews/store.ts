import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { emptyReviewState, type ReviewState } from "./model";
export type StreamRow<T>={id:string;entity_id:string;created_at:string;metadata:{sequence:number;key:string;kind:string;state:T;source:string}};
export function stableRecordId(...parts:string[]) { const h=createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0,32);return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20)}`; }
export async function assertOwnedContact(owner:string,id:string) {const {data,error}=await supabaseAdmin.from("contacts").select("id").eq("owner_id",owner).eq("id",id).maybeSingle();if(error)throw new Error("Contact access is unavailable");if(!data)throw new Error("Contact not found");}
export async function readStream<T>(owner:string,type:"contact_review"|"contact_referral",id?:string):Promise<StreamRow<T>[]> {
 const rows:StreamRow<T>[]=[];
 for(let offset=0;offset<50000;offset+=500){let q=supabaseAdmin.from("audit_logs").select("id,entity_id,created_at,metadata").eq("owner_id",owner).eq("entity_type",type).order("created_at",{ascending:true}).order("id",{ascending:true});if(id)q=q.eq("entity_id",id);const {data,error}=await q.range(offset,offset+499);if(error)throw new Error("Relationship history is unavailable");rows.push(...(data??[]) as StreamRow<T>[]);if((data??[]).length<500)return rows.sort((a,b)=>a.metadata.sequence-b.metadata.sequence);}
 throw new Error("Relationship history exceeds the safe export limit; refine the selection");
}
export class RelationshipConflict extends Error {}
/** Immutable snapshots. A unique predecessor-derived PK provides compare-and-swap without a destructive update. */
export async function appendStream<T>(owner:string,type:"contact_review"|"contact_referral",id:string,expectedRevision:string|null,kind:string,key:string,state:T,source="agent") {
 const rows=await readStream<T>(owner,type,id),last=rows.at(-1);
 if(rows.some(r=>r.metadata.key===key))return rows.find(r=>r.metadata.key===key)!;
 if((last?.id??null)!==expectedRevision)throw new RelationshipConflict("Changed elsewhere. Reload before saving.");
 const row={id:stableRecordId(owner,type,id,expectedRevision??"initial"),owner_id:owner,entity_type:type,entity_id:id,action:type==="contact_review"?"CONTACT_REVIEW_EVENT":"CONTACT_REFERRAL_EVENT",metadata:{sequence:(last?.metadata.sequence??0)+1,key,kind,state,source}};
 const {data,error}=await supabaseAdmin.from("audit_logs").insert(row).select("id,entity_id,created_at,metadata").single();
 if(error?.code==="23505")throw new RelationshipConflict("Changed elsewhere. Reload before saving.");
 if(error||!data)throw new Error("Relationship event could not be saved");return data as StreamRow<T>;
}
export async function currentReview(owner:string,contact:string) {const history=await readStream<ReviewState>(owner,"contact_review",contact);return {history,state:history.at(-1)?.metadata.state??emptyReviewState(),revision:history.at(-1)?.id??null};}
export async function recordReviewObservation(owner:string,contact:string,kind:string,key:string,patch?:Partial<ReviewState>,source="provider") {
 await assertOwnedContact(owner,contact);
 for(let attempt=0;attempt<3;attempt++){const current=await currentReview(owner,contact);if(current.history.some(r=>r.metadata.key===key))return;try {await appendStream(owner,"contact_review",contact,current.revision,kind,key,{...current.state,...patch},source);return;}catch(error){if(!(error instanceof RelationshipConflict))throw error;}}
 throw new RelationshipConflict("Relationship update needs retry");
}
