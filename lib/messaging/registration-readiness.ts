/** Staging candidate gate. Caller must obtain these facts from trusted server/provider records. */
export type SenderRegistration = {workspace:string;business:string;brandSid:string;campaignSid:string;messagingServiceSid:string;number:string;status:'required'|'pending'|'approved'|'rejected';numberAssociated:boolean;verifiedAt:number};
export type ConsentEvidence = {workspace:string;business:string;campaignSid:string;phone:string;purpose:string;status:'unknown'|'granted'|'revoked';source:string;disclosureVersion:string;capturedAt:number;suppressed:boolean};
export function smsReadiness(reg:SenderRegistration,consent:ConsentEvidence,request:{workspace:string;business:string;campaignSid:string;phone:string;purpose:string},now:number,maxRegistrationAgeMs:number) {
 const errors:string[]=[];
 if(reg.workspace!==request.workspace||consent.workspace!==request.workspace)errors.push('workspace_mismatch');
 if(reg.business!==request.business||consent.business!==request.business)errors.push('sender_mismatch');
 if(reg.campaignSid!==request.campaignSid||consent.campaignSid!==request.campaignSid)errors.push('campaign_mismatch');
 if(reg.status!=='approved'||!reg.numberAssociated)errors.push('registration_not_ready');
 if(!reg.brandSid||!reg.campaignSid||!reg.messagingServiceSid||!reg.number)errors.push('sender_assignment_missing');
 if(!Number.isFinite(reg.verifiedAt)||!Number.isFinite(maxRegistrationAgeMs)||maxRegistrationAgeMs<=0||reg.verifiedAt>now||now-reg.verifiedAt>maxRegistrationAgeMs)errors.push('registration_verification_stale');
 if(consent.phone!==request.phone||consent.purpose!==request.purpose)errors.push('consent_scope_mismatch');
 if(consent.status!=='granted'||consent.suppressed)errors.push('consent_not_granted');
 if(!consent.source||!consent.disclosureVersion||!Number.isFinite(consent.capturedAt)||consent.capturedAt>now)errors.push('consent_evidence_missing');
 return {ready:errors.length===0,errors};
}
