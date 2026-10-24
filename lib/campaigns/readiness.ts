import type { CampaignStep } from "@/lib/crm/types";
import type { MergeFieldContext } from "./merge-fields";
import { renderMessage } from "./render-message";
export type CampaignCheck={label:string;status:"Ready"|"Needs Review"|"Blocked"|"Unable to Verify";action:string};
export function campaignReadiness(steps:CampaignStep[],context:MergeFieldContext|null,approvedVoiceIds:string[]=[],consentVerified=false) {
 const checks:CampaignCheck[]=[];
 for(const step of steps){
  if(["sms","email","voicemail"].includes(step.type)){const preview=context?renderMessage(step.type as "sms"|"email"|"voicemail",step.description,step.title,context):null;checks.push({label:`${step.dayLabel}: personalization`,status:preview?.ok?"Ready":context?"Blocked":"Unable to Verify",action:preview?.ok?"Review the exact personalized message before approving.":preview?.issues.join(" ")||"Select an authorized contact and configure your sender details."});}
  if(step.type==="voicemail")checks.push({label:`${step.dayLabel}: recording`,status:step.voiceAssetId&&approvedVoiceIds.includes(step.voiceAssetId)?"Needs Review":"Blocked",action:"Choose the exact approved version and listen to verify it matches this script. Prerecorded audio does not dynamically speak merge fields."});
  if(step.resourceKey)checks.push({label:`${step.dayLabel}: attachment`,status:step.attachments?.length?"Needs Review":"Blocked",action:"Review the PDF, replace blank branding/disclosures and upload it to this email step. Confirm ownership, file size and readability."});
  if(["avatar_video","retargeting"].includes(step.type))checks.push({label:`${step.dayLabel}: unsupported delivery`,status:"Blocked",action:"No supported delivery integration exists. Replace with an appropriate internal follow-up."});
  if(["task","callback"].includes(step.type))checks.push({label:`${step.dayLabel}: internal follow-up`,status:"Unable to Verify",action:"The existing callback/task worker depends on Calendar sync. Confirm that integration or create the task manually; no automatic CRM task is promised."});
 }
 checks.push({label:"Consent, suppression and audience relevance",status:consentVerified?"Needs Review":"Unable to Verify",action:"Verify channel-specific consent, quiet hours, DNC/suppression, frequency and intended audience. Readiness is not legal certification."});
 checks.push({label:"Provider and compliance verification",status:"Unable to Verify",action:"Verify Twilio sender registration, email authentication, monitored opt-out handling, required disclosures and voicemail consent before activation."});
 const status=checks.some(c=>c.status==="Blocked")?"Blocked":checks.some(c=>c.status==="Unable to Verify")?"Unable to Verify":checks.some(c=>c.status==="Needs Review")?"Needs Review":"Ready";
 return {status,checks};
}
