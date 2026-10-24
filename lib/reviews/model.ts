import { z } from "zod";
export const REVIEW_STATUSES = ["not_requested","request_scheduled","request_sent","awaiting_response","client_confirmed","verified","declined","do_not_ask_again"] as const;
export type ReviewStatus = typeof REVIEW_STATUSES[number];
export const REVIEW_LABELS: Record<ReviewStatus,string> = {not_requested:"Not Requested",request_scheduled:"Request Scheduled",request_sent:"Request Sent",awaiting_response:"Awaiting Response",client_confirmed:"Review Confirmed by Client",verified:"Review Verified",declined:"Declined",do_not_ask_again:"Do Not Ask Again"};
export function validZillowReviewUrl(value:string) {
  if(!value)return true;
  try { const url=new URL(value); return url.protocol === "https:" && ["zillow.com","www.zillow.com"].includes(url.hostname.toLowerCase()) && !url.username && !url.password && !url.port && !url.hash && /^\/reviews\/write\/?$/.test(url.pathname) && !!url.searchParams.get("s") && !/[\r\n<>]/.test(value); } catch {return false;}
}
export const ZillowReviewUrlSchema=z.string().trim().max(1000).refine(validZillowReviewUrl,"Use your https Zillow /reviews/write/ link with its s= identifier.");
export type ReviewState={status:ReviewStatus;platform:"zillow";reviewUrl:string;requestDate?:string;confirmationDate?:string;confirmationSource?:"agent"|"client_reported"|"authorized_provider";responsibleSubscriber?:string};
export const emptyReviewState=():ReviewState=>({status:"not_requested",platform:"zillow",reviewUrl:""});
export function reviewReminderDecision(input:{status:ReviewStatus;enabled:boolean;consented:boolean;optedOut:boolean;campaignRunning:boolean}) {
 if(!input.campaignRunning)return {send:false,reason:"Campaign is paused or stopped"};
 if(input.optedOut||!input.consented)return {send:false,reason:"Consent or communication preferences block this channel"};
 if(!input.enabled)return {send:false,reason:"Subscriber has disabled review invitations"};
 if(["client_confirmed","verified","declined","do_not_ask_again"].includes(input.status))return {send:false,reason:`Review invitations suppressed: ${REVIEW_LABELS[input.status]}`};
 return {send:true,reason:"Review status permits an invitation; normal delivery gates still apply"};
}
/** A classification hint only. Never changes review status or proves a review exists. */
export function suggestReviewReply(text:string) {
 if(/\b(stop|unsubscribe|do not contact|don't contact)\b/i.test(text))return "Possible opt-out — existing suppression rules must apply immediately";
 if(/\b(already|submitted|left|wrote|posted)\b.*\breview\b|\breview\b.*\b(submitted|posted)\b/i.test(text))return "Possible client-reported completion — agent confirmation required";
 if(/\b(no|not|don't|decline)\b.*\breview\b/i.test(text))return "Possible declined review request — agent review required";
 if(/\b(link|where|how)\b.*\breview\b|review.*\blink\b/i.test(text))return "Possible request for the review link — draft a reply for approval";
 if(/\breview\b/i.test(text))return "Review-related reply — agent review required";
 return "Ambiguous reply — agent review required";
}
export const REFERRAL_STATUSES=["received","contact_pending","contacted","appointment_scheduled","active_opportunity","closed","not_moving_forward"] as const;
export type ReferralState={referrerId:string;referredId:string;status:typeof REFERRAL_STATUSES[number];referralDate:string;notes:string;followUpTaskId?:string;transactionId?:string};
