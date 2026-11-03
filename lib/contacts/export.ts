import { createHash } from "node:crypto";
import { z } from "zod";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { readWorkspaceState, filterWorkspaceContacts, sortWorkspaceContacts, contactConsentStatus } from "./workspace";
import type { OwnedContact } from "./read-snapshot";

const ids=z.array(z.string().uuid()).max(50000).refine(v=>new Set(v).size===v.length,"Reselect contacts without duplicates.");
const filters=z.object({
 q:z.string().max(512).default(""),search:z.string().max(512).default(""),
 segment:z.enum(["all","cold-lead","active-lead","past-client"]).default("all"),
 category:z.string().max(40).default("all"),type:z.string().max(200).default("all"),
 source:z.string().max(300).default("all"),compliance:z.enum(["all","valid","pending","blocked"]).default("all"),
 activity:z.enum(["all","7","30","none"]).default("all"),
 sort:z.enum(["name-asc","name-desc","recent"]).default("name-asc"),
}).strict();
const selection=z.discriminatedUnion("scope",[
 z.object({scope:z.literal("all")}).strict(),
 z.object({scope:z.literal("selected"),ids}).strict(),
 z.object({scope:z.literal("filtered"),filters,viewIds:ids.optional()}).strict(),
]);
export const ExportRequest=z.object({
 action:z.enum(["preview","download"]),selection,
 expectedCount:z.number().int().nonnegative().optional(),
 fingerprint:z.string().regex(/^[a-f0-9]{64}$/).optional(),
}).strict();
export type ExportSelection=z.infer<typeof selection>;
export function selectExportContacts(rows:OwnedContact[], input:ExportSelection, now=Date.now()){
 if(input.scope==="all")return rows;
 const requested=input.scope==="selected"?input.ids:input.viewIds;
 if(requested){
  const owned=new Set(rows.map(r=>r.id));
  if(requested.some(id=>!owned.has(id)))throw new ExportError("Some requested contacts are unavailable. Refresh Contacts and select them again.",409);
 }
 if(input.scope==="selected"){const wanted=new Set(input.ids);return rows.filter(r=>wanted.has(r.id));}
 const params=new URLSearchParams(Object.entries(input.filters));
 const state=readWorkspaceState(params);
 const visible=requested?new Set(requested):null;
 return sortWorkspaceContacts(filterWorkspaceContacts(rows,state,now),state.segment,state.sort)
  .filter(r=>!visible||visible.has(r.id)) as OwnedContact[];
}
export class ExportError extends Error{constructor(message:string,public status:number){super(message);}}
type Row=ApiContact & Record<string,unknown>;
const value=(r:Row,k:string)=>typeof r[k]==="string"||typeof r[k]==="number"?String(r[k]):"";
const boolean=(r:Row,k:string)=>typeof r[k]==="boolean"?(r[k]?"Yes":"No"):"";
export const CSV_COLUMNS=[
 ["First Name",(r:Row)=>r.first_name],["Last Name",(r:Row)=>r.last_name??""],
 ["Full Name",(r:Row)=>[r.first_name,r.last_name].filter(Boolean).join(" ")],
 ["Email",(r:Row)=>r.email??""],["Phone",(r:Row)=>r.phone??"","text"],
 ["Contact Type",(r:Row)=>r.type??""],["Lead Stage",(r:Row)=>value(r,"lead_status")],
 ["Lead Source",(r:Row)=>r.source??""],["Category",(r:Row)=>r.category??""],
 ["Tags",(r:Row)=>Array.isArray(r.tags)?r.tags.filter(x=>typeof x==="string").join("; "):value(r,"tags")],
 ["Property Interest",(r:Row)=>value(r,"property_interest")],
 ["Property Address",(r:Row)=>r.property_address??""],["Preferred Area",(r:Row)=>r.preferred_area??""],
 ["Address",(r:Row)=>value(r,"address")||value(r,"street_address")],
 ["City",(r:Row)=>value(r,"city")],["State",(r:Row)=>value(r,"state")],
 ["ZIP",(r:Row)=>value(r,"zip")||value(r,"zip_code")||value(r,"postal_code"),"text"],
 ["Lead Type",(r:Row)=>r.lead_type??""],["Budget",(r:Row)=>r.budget??""],
 ["Preferred Property Type",(r:Row)=>r.preferred_property_type??""],
 ["Preferred Beds",(r:Row)=>r.preferred_beds??""],["Preferred Baths",(r:Row)=>r.preferred_baths??""],
 ["Preferred Square Feet",(r:Row)=>r.preferred_sqft??""],
 ["Do Not Contact",(r:Row)=>boolean(r,"dnc")],["Opt Out Requested",(r:Row)=>boolean(r,"opt_out_requested")],
 ["Consent Review Status",(r:Row)=>contactConsentStatus(r)],
 ["Last Contacted",(r:Row)=>r.last_contacted??""],["Last Engagement",(r:Row)=>r.last_engagement_at??""],
 ["Created Date",(r:Row)=>r.created_at??""],["Last Updated Date",(r:Row)=>value(r,"updated_at")],
] as const;
export function csvCell(raw:unknown,asText=false){
 let s=raw==null?"":String(raw).replaceAll("\u0000","");
 // Apostrophe is a text marker, never a spreadsheet formula. Cover whitespace/control-prefixed formulas.
 if(s && (asText || /^[\s\u0000-\u001f]*[=+@-]/u.test(s) || /^[\t\r\n]/.test(s)))s="'"+s;
 return '"'+s.replaceAll('"','""')+'"';
}
export const csvHeader=()=>CSV_COLUMNS.map(c=>csvCell(c[0])).join(",")+"\r\n";
export const csvRow=(r:OwnedContact)=>CSV_COLUMNS.map(c=>csvCell(c[1](r as Row),c.length===3&&c[2]==="text")).join(",")+"\r\n";
export function exportFingerprint(owner:string,rows:OwnedContact[]){
 const hash=createHash("sha256").update(owner+"\n");
 for(const r of rows)hash.update(r.id+"\n"+csvRow(r));
 return hash.digest("hex");
}
export function csvStream(rows:OwnedContact[]){
 const encoder=new TextEncoder();let index=0;let header=false;
 return new ReadableStream<Uint8Array>({
  pull(controller){
   if(!header){header=true;controller.enqueue(encoder.encode("\uFEFF"+csvHeader()));return;}
   if(index>=rows.length){controller.close();return;}
   controller.enqueue(encoder.encode(rows.slice(index,index+100).map(csvRow).join("")));
   index+=100;
  }
 });
}
