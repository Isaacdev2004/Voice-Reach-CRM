import { readReviewEvidence } from "@/lib/reviews/evidence";
import { apiOk,apiError,withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";
import { REVIEW_STATUSES,emptyReviewState,ZillowReviewUrlSchema,type ReviewState } from "@/lib/reviews/model";
import { assertOwnedContact,currentReview,readStream,appendStream,RelationshipConflict } from "@/lib/reviews/store";
const Update=z.object({contactId:z.string().uuid(),status:z.enum(REVIEW_STATUSES),reviewUrl:ZillowReviewUrlSchema.default(""),expectedRevision:z.string().uuid().nullable(),idempotencyKey:z.string().uuid()}).strict();
export const GET=withApiHandler(async request=>{
 const owner=await requireUserId(),contact=new URL(request.url).searchParams.get("contactId");
 if(contact){
  z.string().uuid().parse(contact);await assertOwnedContact(owner,contact);
  const current=await currentReview(owner,contact);let evidence=null;try{evidence=await readReviewEvidence(owner,contact);}catch{}
  const last=current.history.at(-1)?.created_at??"";
  const receipt=evidence?.history.find(e=>e.kind==="request_sent"&&e.at>last);
  const scheduled=evidence?.history.find(e=>e.kind==="request_scheduled"&&e.at>last);
  const state=["client_confirmed","verified","declined","do_not_ask_again"].includes(current.state.status)?current.state:receipt?{...current.state,status:"request_sent" as const,requestDate:receipt.at}:scheduled?{...current.state,status:"request_scheduled" as const}:current.state;
  return apiOk({...current,state,evidence,evidenceAvailable:evidence!==null});
 }
 let evidence=null;try{evidence=await readReviewEvidence(owner);}catch{}
 const events=await readStream<ReviewState>(owner,"contact_review"),latest=new Map(events.map(row=>[row.entity_id,row]));
 const recipients=new Set(evidence?.history.filter(e=>e.kind==="request_sent").map(e=>e.contactId));
 const awaiting=evidence?[...recipients].filter(id=>!["client_confirmed","verified","declined","do_not_ask_again"].includes(latest.get(id)?.metadata.state.status??"not_requested")).length:null;
 const skips=new Set([...(evidence?.history.filter(e=>e.kind==="reminder_skipped").map(e=>e.id.replace("review-skip:",""))??[]),...events.filter(e=>e.metadata.kind==="reminder_skipped").map(e=>e.metadata.key.replace("skip:",""))]);
 return apiOk({evidence,evidenceAvailable:evidence!==null,independentVerificationSupported:false,records:[...latest.values()],metrics:{requestsSent:evidence?.requestsSent??null,awaitingResponse:awaiting,clientConfirmed:[...latest.values()].filter(e=>e.metadata.state.status==="client_confirmed").length,verified:null,declined:[...latest.values()].filter(e=>e.metadata.state.status==="declined").length,skippedReminders:evidence?skips.size:null}});
});
export const POST=withApiHandler(async request=>{const owner=await requireUserId(),body=Update.parse(await request.json());await assertOwnedContact(owner,body.contactId);
 if(body.status==="verified")return apiError("Independent verification is unavailable: no authorized Zillow verification source is connected. Use client-confirmed only when the client has reported completion.",{status:400});
 if(["request_scheduled","request_sent","awaiting_response"].includes(body.status))return apiError("Sent status requires a real provider receipt; it cannot be set manually.",{status:400});
 const current=await currentReview(owner,body.contactId),state={...emptyReviewState(),...current.state,status:body.status,reviewUrl:body.reviewUrl,responsibleSubscriber:owner,...(body.status==="client_confirmed"?{confirmationDate:new Date().toISOString(),confirmationSource:"client_reported" as const}:{confirmationDate:undefined,confirmationSource:undefined})};
 try{return apiOk({record:await appendStream(owner,"contact_review",body.contactId,body.expectedRevision,"status_updated",body.idempotencyKey,state,"agent")});}catch(error){if(error instanceof RelationshipConflict)return apiError(error.message,{status:409});throw error;}
});
