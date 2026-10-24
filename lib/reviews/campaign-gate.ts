import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentReview,recordReviewObservation } from "./store";
import { reviewReminderDecision } from "./model";
/** Additional restriction only. Consent/opt-out/campaign facts must come from existing authorized worker checks. */
export async function reviewCampaignGate(owner:string,contact:string,runId:string,kind:unknown,facts:{enabled:boolean;consented:boolean;optedOut:boolean;campaignRunning:boolean}) {
 if(kind!=="request"&&kind!=="reminder")return {send:false,reason:"Invalid review step classification"};
 const settings=await supabaseAdmin.from("audit_logs").select("metadata").eq("owner_id",owner).eq("entity_type","user_settings").eq("action","SETTINGS_SAVED").order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(settings.error)throw Error("Review preferences cannot be verified");
 const enabled=settings.data?.metadata?.settings?.brandKit?.reviewRequestsEnabled;
 const review=await currentReview(owner,contact);
 const result=reviewReminderDecision({...facts,enabled:typeof enabled === "boolean" ? enabled : facts.enabled,status:review.state.status});
 if(!result.send)await recordReviewObservation(owner,contact,kind==="reminder"?"reminder_skipped":"request_skipped",`skip:${runId}`,undefined,"campaign");
 return result;
}
