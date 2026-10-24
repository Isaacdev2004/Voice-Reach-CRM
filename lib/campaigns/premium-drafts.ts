import { PRODUCT_CAMPAIGN_TEMPLATES } from "@/lib/crm/campaign-templates";
import type { CampaignDefinition,CampaignStep } from "@/lib/crm/types";
import { COPY,proposedDescription } from "./premium-copy";
export const CAMPAIGN_MATERIALS = {
 "readiness-checklist":"Homebuying Readiness Checklist",
 "commercial-planning":"Commercial Property Planning Guide",
 "buyer-preparation":"Buyer Preparation Guide",
 "seller-preparation":"Home Selling Preparation Checklist",
 "homeowner-care":"Seasonal Homeowner Care Guide",
 "buyer-seller-planning":"Buyer & Seller Planning Guide",
 "property-comparison":"Property Comparison Worksheet",
} as const;
const resources:Record<string,keyof typeof CAMPAIGN_MATERIALS>={"cold-lead-reengage":"readiness-checklist","long-term-buyer-nurture":"buyer-preparation","luxury-seller-follow-up":"seller-preparation","seller-valuation-follow-up":"seller-preparation","past-client-anniversary":"homeowner-care","post-tour-follow-up":"property-comparison"};
export type PremiumDraft=CampaignDefinition&{sourceId:string;revisionKey:string;reviewOnly:true};
const step=(order:number,day:number,type:CampaignStep["type"],title:string,description:string,extra:Partial<CampaignStep>={}):CampaignStep=>({id:`premium-step-${order}`,order,type,title,description,dayLabel:`Day ${day}`,delayMinutes:(day-1)*1440,timeLabel:"10:00 AM",status:"draft",...extra});
export const PREMIUM_CAMPAIGN_DRAFTS:PremiumDraft[] = PRODUCT_CAMPAIGN_TEMPLATES.map(template=>{
 const duration=template.templateKey==="luxury-seller-follow-up"||template.templateKey==="seller-valuation-follow-up"?30:template.durationDays;
 const steps=template.steps.map((original,index)=>{
  const type=["avatar_video","retargeting","callback"].includes(original.type)?"task":original.type;
  const day=Math.max(1,Math.round(1+index*(duration-1)/Math.max(1,template.steps.length-1)));
  const originalCopy=COPY[template.templateKey]?.[index];
  const message=type === "voicemail" ? originalCopy?.replace(/^Hi \[FirstName\],/i,"Hi,") : originalCopy;
  if(!message)throw new Error(`Missing reviewed copy: ${template.templateKey} step ${index+1}`);
  const resource=resources[template.templateKey];
  return step(index+1,day,type,type==="email"?message.split("|")[0]:type==="task"?"Agent review — no message sent":type==="voicemail"?"An invitation to connect":["A thoughtful introduction","Your priorities","Planning at your pace","A useful next step","Your preferred timing","Staying connected","Here when useful"][index%7],proposedDescription(type,message),resource&&original.type==="email"&&index===template.steps.findIndex(s=>s.type==="email")?{resourceKey:resource}:{});
 });
 return {...template,id:`premium-${template.id}`,name:`${template.name} — Premium Draft`,sourceId:template.id,revisionKey:`premium-v1-${template.templateKey}`,reviewOnly:true,durationDays:duration,stats:{reach:0,replies:0,responseRate:0},steps};
});
PREMIUM_CAMPAIGN_DRAFTS.push({id:"premium-commercial-28",sourceId:"new-commercial-draft",revisionKey:"premium-v1-commercial-28",reviewOnly:true,name:"Commercial Property Planning — Premium Draft",description:"A professional 28-day draft for acquisition, leasing and business-space requirements. No market or return claims.",audience:"Commercial property decision-makers with documented consent",durationDays:28,goals:["Clarify property requirements","Arrange an optional consultation"],stats:{reach:0,replies:0,responseRate:0},steps:[
 step(1,1,"email","An introduction on your terms","Subject: A thoughtful starting point for your property plans\n\nHi [FirstName],\n\nI'm [Agent] with [Brokerage]. If you are considering an acquisition, lease or change in business space, I can help you organize the questions that matter. Which property objective is most important to you?\n\n[Agent]\n[AgentPhone]\nReply if you prefer no further updates.",{resourceKey:"commercial-planning"}),
 step(2,7,"sms","Understanding your requirements","Hi [FirstName], this is [Agent]. Are your commercial property plans centered on acquiring, leasing or changing business space? Reply STOP to opt out."),
 step(3,14,"voicemail","A professional introduction","Hi, this is [Agent] with [Brokerage]. If it would be useful to talk through your commercial property requirements, please call me at [AgentPhone]. I would be glad to start with your priorities. Thank you."),
 step(4,21,"email","Space for a useful conversation","Subject: A clear brief for your next property decision\n\nHi [FirstName],\n\nA useful property brief can bring location, intended use, timing and space requirements into focus. Would a short conversation help you organize those priorities?\n\n[Agent]\nReply if you prefer no further updates."),
 step(5,28,"sms","Your timing comes first","Hi [FirstName], this is [Agent]. Would you prefer a later follow-up about your commercial plans, or should I pause for now? Reply STOP to opt out.")
]});
PREMIUM_CAMPAIGN_DRAFTS.push({id:"premium-relationships-worth-sharing",sourceId:"new-referral-review-draft",revisionKey:"premium-v1-relationships-worth-sharing",reviewOnly:true,name:"Relationships Worth Sharing",description:"A 90-day relationship, voluntary honest review and referral draft. Review reminders are conditional; no automatic enrollment or activation.",audience:"Past clients who have authorized the relevant communication channel",durationDays:90,goals:["Maintain genuine relationships","Invite voluntary honest feedback","Offer thoughtful guidance to referrals"],stats:{reach:0,replies:0,responseRate:0},steps:[
 step(1,1,"sms","A personal thank you","Hi [FirstName], it's [AgentName]. Thank you again for trusting me with your real estate journey. I hope everything is going wonderfully! Reply STOP to opt out."),
 step(2,14,"email","Your experience means so much","Subject: A small favor, if you have a moment\n\nHi [FirstName],\n\nIt was a pleasure helping you with your real estate journey. If you feel comfortable sharing your honest experience in a Zillow review, I would be grateful for your feedback.\n\nYou can leave a review here:\n[ZillowReviewLink]\n\nThank you again for your trust.\n\n[AgentName]\n[AgentPhone]\nReply if you prefer no further updates.",{reviewRequest:"request"}),
 step(3,30,"voicemail","Staying connected","Hi, this is [AgentName]. I wanted to say hello and thank you again for trusting me with your real estate journey. If you or someone you know could use real estate guidance, I'm happy to help. Please call me at [AgentPhone] whenever it is useful. Take care."),
 step(4,45,"sms","A gentle review invitation","Hi [FirstName], if you feel comfortable sharing your experience, I would appreciate an honest Zillow review: [ZillowReviewLink] Thank you again. [AgentName]. Reply STOP to opt out.",{reviewRequest:"reminder"}),
 step(5,60,"email","A resource worth sharing","Subject: A helpful guide for your next chapter\n\nHi [FirstName],\n\nThe Buyer & Seller Planning Guide is attached for anyone considering a next move. If someone in your circle would like thoughtful real estate guidance, I would be grateful for an introduction.\n\nAnd of course, I'm here for your questions too.\n\n[AgentName]\n[AgentPhone]\nReply if you prefer no further updates.",{resourceKey:"buyer-seller-planning"}),
 step(6,90,"sms","Relationships worth sharing","Hi [FirstName], it's [AgentName]. If someone you know is considering buying or selling, I'd be happy to be a resource. I'm a call or text away whenever it is helpful. Reply STOP to opt out.")
]});

// Draft emails require actual business identity before they can be sent.
for (const draft of PREMIUM_CAMPAIGN_DRAFTS) for (const s of draft.steps) if(s.type === "email") s.description += "\n[BusinessAddress]";
