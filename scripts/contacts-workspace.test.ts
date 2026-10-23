import { normalizedContactView, restoreContactView, saveContactView } from "../lib/contacts/view-memory";
import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ownedConsentRecords } from "../lib/contacts/owned-consent";
import { createContactBulkHandler } from "../lib/contacts/bulk-handler";
import { contactConsentStatus, contactLastActivity, filterWorkspaceContacts, readWorkspaceState, sortWorkspaceContacts } from "../lib/contacts/workspace";
import { contactMetricCounts } from "../lib/contacts/metrics";
import type { ApiContact } from "../lib/hooks/use-contacts";

const now = Date.parse("2026-10-22T12:00:00Z");
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const row = (n: number, type = "Cold Lead", extra: Partial<ApiContact> = {}) => ({id:id(n), first_name: `Person ${n}`, phone:"+15555550101", type, source:"Referral", category:"Luxury", ...extra});
const state = (query = "") => readWorkspaceState(new URLSearchParams(query));
const rows = [row(1,"Active Lead",{first_name:"Zoe",last_name:"Jones",tags:["Investor"],last_contacted:"2026-10-21"}),
  row(2,"Cold Lead",{first_name:"Amy",category:"Commercial",source:"Website"}), row(3,"Past Client",{first_name:"Bea",last_contacted:"invalid"})];

test("combined filters, search by full name/category/tags, lifecycle counts and empty results share one cohort", () => {
  const selected = state("category=Luxury&type=Active+Lead&source=Referral&compliance=pending&activity=7&search=Zoe+Jones");
  const matching = filterWorkspaceContacts(rows,selected,now);
  assert.deepEqual(matching.map(r=>r.id),[id(1)]);
  assert.equal(contactMetricCounts(matching).activeLead,1);
  assert.equal(filterWorkspaceContacts(rows,state("search=Investor&q=Zoe"),now).length,1);
  assert.equal(filterWorkspaceContacts(rows,state("search=Luxury"),now).length,2);
  assert.equal(filterWorkspaceContacts(rows,state("category=Commercial&source=Referral"),now).length,0);
  assert.equal(filterWorkspaceContacts(rows,state("activity=none"),now).length,2);
  const engaged=row(8,"Cold Lead",{last_contacted:"2025-01-01",last_engagement_at:"2026-10-21"});
  assert.equal(contactLastActivity(engaged),"2026-10-21");
  assert.equal(filterWorkspaceContacts([engaged],state("activity=7"),now).length,1);
  assert.equal(filterWorkspaceContacts([row(4,"Cold Lead",{last_contacted:"2027-01-01"})],state("activity=7"),now).length,0);
});

test("sorting preserves input; newest consent and opt-outs control labels without changing eligibility rules", () => {
  assert.deepEqual(sortWorkspaceContacts(rows,"all","name-asc").map(r=>r.first_name),["Amy","Bea","Zoe"]);
  assert.equal(rows[0].first_name,"Zoe");
  const contact = row(1,"Cold Lead",{consent_records:[{status:"Yes",created_at:"2026-01-01"},{status:"No",created_at:"2026-02-01"}]});
  assert.equal(contactConsentStatus(contact),"blocked");
  assert.equal(contactConsentStatus({...contact,consent_records:[...contact.consent_records!].reverse()}),"blocked");
  assert.equal(contactConsentStatus({...contact,opt_out_requested:true,consent_records:[{status:"Yes"}]}),"blocked");
});

test("URL state survives round trips, validates enum/page values, and supports old market links", () => {
  const params = new URLSearchParams("category=Luxury&type=Custom+Buyer&segment=active-lead&source=Referral&activity=30&compliance=valid&search=Jones&q=Zoe&sort=name-desc&page=3");
  assert.deepEqual(readWorkspaceState(new URLSearchParams(params.toString())),readWorkspaceState(params));
  assert.equal(state("page=-1&segment=fake&sort=fake&activity=NaN").page,1);
  assert.equal(state("market=commercial").category,"commercial");
  assert.deepEqual(state(),{segment:"all",category:"all",type:"all",source:"all",compliance:"all",activity:"all",search:"",q:"",sort:"name-asc",page:1});
});

function mockDatabase(options: {failRead?:boolean; failWrite?:boolean} = {}) {
  let records = [ {...row(1),owner_id:"a"}, {...row(2),owner_id:"b"} ];
  const writes: unknown[] = []; const reads: string[] = []; const consents: unknown[] = [];
  const database = {from(table:string) {
    let owner = ""; let ids:string[]=[]; let action="read"; let updates:Record<string,unknown>={};
    const builder = {
      select(){return builder;},eq(key:string,value:string){assert.equal(key,"owner_id");owner=value;return builder;},
      in(key:string,value:string[]){assert.equal(key,"id");ids=value;return builder;},
      update(value:Record<string,unknown>){action="update";updates=value;return builder;},
      delete(){action="delete";return builder;},
      async insert(value:unknown[]){assert.equal(table,"consent_records");writes.push(value);if(options.failWrite)return{error:{message:"private"}};consents.push(...value);return {error:null};},
      then(resolve:(value:unknown)=>unknown){
        assert.equal(table,"contacts");assert.ok(owner);
        const matching=records.filter(r=>r.owner_id===owner && ids.includes(r.id));
        if(action==="read"){reads.push(owner);return Promise.resolve(resolve({data:options.failRead?null:matching,error:options.failRead?{message:"private"}:null}));}
        writes.push({owner,ids,action});
        if(options.failWrite)return Promise.resolve(resolve({error:{message:"private"},count:null}));
        if(action==="delete")records=records.filter(r=>!matching.includes(r));else for(const record of matching)Object.assign(record,updates);
        return Promise.resolve(resolve({error:null,count:matching.length}));
      }
    };return builder;
  }} as unknown as SupabaseClient;
  return {database,writes,reads,consents,records:()=>records};
}
async function bulk(db:ReturnType<typeof mockDatabase>, body:Record<string,unknown>, owner="a") {
  const handle=createContactBulkHandler({database:db.database,requireOwnerId:async()=>{if(!owner)throw new Error("Unauthorized");return owner;},audit:async()=>{}});
  const response=await handle(new Request("http://test/api/contacts/bulk",{method:"POST",body:JSON.stringify(body)}),undefined);
  return {status:response.status,body:await response.json()};
}
const consent={consent:"Yes",consentDate:"2026-10-22",consentSource:"Website form",proof:"Documented opt-in"};

test("every bulk action rejects mixed, foreign, or missing selections before any writes", async()=>{
  for(const action of ["delete","set_type","set_category","set_consent"]){
    for(const ids of [[id(2)],[id(1),id(2)],[id(3)]]){
      const db=mockDatabase();const result=await bulk(db,{action,ids,type:"Active Lead",category:"Commercial",...consent});
      assert.equal(result.status,404);assert.equal(db.writes.length,0);assert.deepEqual(db.reads,["a"]);
    }
  }
});

test("authorized bulk updates deduplicate selections, retain tenant boundary and refreshable lifecycle counts",async()=>{
  for(const action of ["delete","set_type","set_category","set_consent"]){
    const db=mockDatabase();const result=await bulk(db,{action,ids:[id(1),id(1)],owner_id:"b",type:"Active Lead",category:"Commercial",...consent});
    assert.equal(result.status,200);assert.equal(result.body.deleted ?? result.body.updated,1);
    assert.equal(db.records().find(r=>r.owner_id==="b")?.type,"Cold Lead");
    if(action==="set_type")assert.equal(contactMetricCounts(db.records().filter(r=>r.owner_id==="a")).activeLead,1);
    if(action==="set_category")assert.equal(db.records()[0].category,"Commercial");
    if(action==="delete")assert.equal(db.records().length,1);
    if(action==="set_consent")assert.deepEqual(db.consents,[{owner_id:"a",contact_id:id(1),status:"Yes",consent_date:consent.consentDate,source:consent.consentSource,proof_reference:consent.proof}]);
  }
});

test("bulk auth, validation and failures never write or expose internal database details",async()=>{
  let db=mockDatabase();assert.equal((await bulk(db,{action:"delete",ids:[id(1)]},"")).status,401);assert.equal(db.reads.length,0);
  db=mockDatabase();assert.equal((await bulk(db,{action:"set_consent",ids:[id(1)],...consent,proof:"  "})).status,400);assert.equal(db.writes.length,0);
  for(const options of [{failRead:true},{failWrite:true}]){db=mockDatabase(options);const result=await bulk(db,{action:"set_type",ids:[id(1)],type:"Active Lead"});assert.ok(result.status>=500);assert.ok(!JSON.stringify(result.body).includes("private"));}
});

test("consent snapshots exclude historical foreign or mislinked child records",()=>{
  const records=[{owner_id:"a",contact_id:id(1),status:"Yes"},{owner_id:"b",contact_id:id(1),status:"No"},{owner_id:"a",contact_id:id(2),status:"Yes"}];
  assert.deepEqual(ownedConsentRecords(records,"a",id(1)),[records[0]]);
});

test("contact views survive tab return, honor explicit links and Clear all, and stay owner-scoped",()=>{
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  const view="segment=active-lead&category=Luxury&source=Referral&sort=name-desc&page=2&search=Jones";
  restoreContactView(storage,"a",view);saveContactView(storage,"a",view);
  assert.equal(restoreContactView(storage,"a",""),normalizedContactView(view));
  assert.equal(restoreContactView(storage,"a","segment=past-client"),"segment=past-client");
  assert.equal(restoreContactView(storage,"b",view,"a"),"", "a's URL must not become b's saved view");
  saveContactView(storage,"b","segment=cold-lead");
  assert.equal(restoreContactView(storage,"a","segment=cold-lead","b"),normalizedContactView(view));
  assert.equal(restoreContactView(storage,"b","segment=active-lead"),"segment=active-lead", "an explicit link from a different tab wins over memory");
  saveContactView(storage,"a","");assert.equal(restoreContactView(storage,"a",""),"");
  assert.equal(restoreContactView(storage,"b",""),"segment=cold-lead");
  assert.equal(normalizedContactView("segment=bad&sort=bad&page=-1&technical=secret"),"");
});
