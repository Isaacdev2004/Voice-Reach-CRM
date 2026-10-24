import { ownedRows } from "@/lib/delivery/owned-rows";
import { suggestReviewReply } from "./model";
import { sharedReceiver } from "@/lib/communications/safety";
type Row={id:string;[key:string]:unknown};
/** Read-only projection. Does not alter webhooks, delivery, enrollments, consent or review confirmations. */
export async function readReviewEvidence(owner:string,contactId?:string) {
 const contactFilter:Record<string,string>=contactId?{contact_id:contactId}:{};
 const [messages,steps,events,inbound,recipients,runs]=await Promise.all([
  ownedRows<Row>("outbound_messages","*",owner,undefined,contactFilter),ownedRows<Row>("campaign_steps","id,conditions",owner),ownedRows<Row>("outbound_delivery_events","*",owner),ownedRows<Row>("inbound_communications","*",owner,undefined,contactFilter),ownedRows<Row>("campaign_recipients","id,contact_id",owner,undefined,contactFilter),ownedRows<Row>("campaign_step_runs","id,recipient_id,step_id,status,scheduled_at,executed_at,result",owner),
 ]);
 const kindByStep=new Map(steps.map(s=>[s.id,(s.conditions as Record<string,unknown>|null)?.reviewRequest]));
 const reviewSteps=new Set(steps.filter(s=>["request","reminder"].includes(String((s.conditions as Record<string,unknown>|null)?.reviewRequest))).map(s=>s.id));
 const reviews=messages.filter(m=>reviewSteps.has(String(m.step_id)));
 const receipts=new Map<string,Row>();
 for(const message of reviews){const receipt=events.filter(e=>e.message_id===message.id&&["sent","delivered"].includes(String(e.event_type))&&["webhook","reconciliation"].includes(String(e.source))).sort((a,b)=>String(a.occurred_at).localeCompare(String(b.occurred_at)))[0];if(receipt)receipts.set(String(message.logical_key??message.id),{...receipt,contact_id:message.contact_id,requestId:message.id});}
 const contacted=new Set(reviews.map(m=>String(m.contact_id)));
 const history=[...receipts.values()].map(e=>({id:`review-receipt:${e.id}`,contactId:String(e.contact_id),kind:"request_sent",at:String(e.occurred_at),source:"provider receipt",detail:"Provider-confirmed message transmission; not proof of a review."}));
 const contactByRecipient=new Map(recipients.map(r=>[r.id,String(r.contact_id)]));
 for(const run of runs.filter(r=>reviewSteps.has(String(r.step_id))&&contactByRecipient.has(String(r.recipient_id)))){
   if(run.status === "scheduled")history.push({id:`review-schedule:${run.id}`,contactId:contactByRecipient.get(String(run.recipient_id))!,kind:"request_scheduled",at:String(run.scheduled_at),source:"actual campaign schedule",detail:"Subject to consent, campaign state and review preferences at execution."});
   if(run.status === "skipped")history.push({id:`review-skip:${run.id}`,contactId:contactByRecipient.get(String(run.recipient_id))!,kind:kindByStep.get(String(run.step_id)) === "reminder"?"reminder_skipped":"request_skipped",at:String(run.executed_at??run.scheduled_at),source:"actual step result",detail:typeof (run.result as Record<string,unknown>|null)?.reason === "string" ? String((run.result as Record<string,unknown>).reason) : "Skipped by the campaign worker."});
 }
 for(const reply of inbound.filter(r=>r.kind==="sms"&&contacted.has(String(r.contact_id))&&!sharedReceiver(String(r.to_number??""))))history.push({id:`review-reply:${reply.id}`,contactId:String(reply.contact_id),kind:"client_response",at:String(reply.received_at),source:"rules-based suggestion, not verification",detail:suggestReviewReply(String(reply.body??""))});
 return {history:history.sort((a,b)=>b.at.localeCompare(a.at)),requestsSent:receipts.size};
}
