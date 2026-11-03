import {test} from "node:test";
import assert from "node:assert/strict";
import Papa from "papaparse";
import {createContactExportHandler} from "../lib/contacts/export-handler";
import {readContactSnapshot,type OwnedContact} from "../lib/contacts/read-snapshot";
import {csvCell,csvRow,CSV_COLUMNS} from "../lib/contacts/export";
const A="agent-a",B="agent-b";
const id=(n:number)=>"00000000-0000-4000-8000-"+String(n).padStart(12,"0");
const contact=(n:number,extra:Record<string,unknown>={}):OwnedContact=>({id:id(n),owner_id:A,dnc:false,first_name:"Contact "+n,last_name:"Synthetic",phone:"00123456789",created_at:"2026-11-01T12:00:00Z",...extra});
let rows=[contact(1,{first_name:"Zoë, 李",last_name:'O"Brien',email:null,notes:"SECRET NOTE",api_key:"SECRET KEY",source:"Referral",type:"Active Lead",category:"Luxury",zip:"00501",tags:["Buyer","Coastal"],lead_status:"warm"}),contact(2,{first_name:"=HYPERLINK(\"https://evil.test\")",phone:"0000123",source:"Web",type:"Cold Lead"}),contact(3,{first_name:"مرحبا",phone:"",email:"",source:"Referral",type:"Past Client"})];
let ownerCalls:string[]=[];
const handler=createContactExportHandler({requireOwnerId:async()=>A,readContacts:async owner=>{ownerCalls.push(owner);return rows;},now:()=>new Date("2026-11-02T12:00:00Z")});
const request=(data:unknown,headers:Record<string,string>={})=>new Request("https://preview.example/api/contacts/export",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://preview.example",...headers},body:JSON.stringify(data)});
async function exportSelection(selection:unknown){
 const p=await handler(request({action:"preview",selection}));assert.equal(p.status,200);const preview=await p.json();
 const r=await handler(request({action:"download",selection,expectedCount:preview.count,fingerprint:preview.fingerprint}));
 return {r,preview};
}
test("all contacts: BOM, filename, international characters, quoting, no private fields",async()=>{
 const {r,preview}=await exportSelection({scope:"all"});assert.equal(preview.count,3);assert.equal(r.status,200);
 const bytes=new Uint8Array(await r.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
 const csv=new TextDecoder().decode(bytes),parsed=Papa.parse<Record<string,string>>(csv,{header:true,skipEmptyLines:true});
 assert.equal(parsed.data.length,3);assert.equal(parsed.data[0]["First Name"],"Zoë, 李");assert.equal(parsed.data[0]["Last Name"],'O"Brien');assert.equal(parsed.data[2]["First Name"],"مرحبا");
 assert.equal(parsed.data[0].Phone,"'00123456789");assert.equal(parsed.data[0].ZIP,"'00501");assert.equal(parsed.data[0].Email,"");
 assert.equal(parsed.data[0].Tags,"Buyer; Coastal");assert.equal(parsed.data[0]["Lead Stage"],"warm");
 for(const secret of ["SECRET NOTE","SECRET KEY","owner_id",id(1),"proof_reference"])assert.ok(!csv.includes(secret));
 assert.ok(r.headers.get("content-disposition")!.includes("myari-contacts-2026-11-02.csv"));assert.ok(r.headers.get("cache-control")!.includes("no-store"));
});
test("selected exports contain exactly the requested owned contacts",async()=>{const {r}=await exportSelection({scope:"selected",ids:[id(3)]});const parsed=Papa.parse<Record<string,string>>(await r.text(),{header:true,skipEmptyLines:true});assert.equal(parsed.data.length,1);assert.equal(parsed.data[0]["First Name"],"مرحبا");});
test("filters match existing search/stage/category/type/source/compliance/activity behavior",async()=>{
 const {r,preview}=await exportSelection({scope:"filtered",filters:{search:"Zoë",segment:"active-lead",category:"Luxury",source:"Referral",type:"Active Lead",compliance:"pending",activity:"none",sort:"name-desc"}});
 assert.equal(preview.count,1);assert.ok((await r.text()).includes("Zoë"));
});
test("pulse view IDs restrict filtered results and an empty pulse does not export all",async()=>{
 const first=await exportSelection({scope:"filtered",filters:{},viewIds:[id(1)]});assert.equal(first.preview.count,1);
 const empty=await exportSelection({scope:"filtered",filters:{},viewIds:[]});assert.equal(empty.preview.count,0);assert.equal(empty.r.status,422);
});
test("empty matches and empty selected exports report a useful empty state",async()=>{
 const {r,preview}=await exportSelection({scope:"filtered",filters:{search:"no-match"}});assert.equal(preview.count,0);assert.equal(r.status,422);
 assert.equal((await (await handler(request({action:"preview",selection:{scope:"selected",ids:[]}}))).json()).count,0);
});
test("foreign or deleted selected IDs are denied without disclosing foreign records",async()=>{
 const r=await handler(request({action:"preview",selection:{scope:"selected",ids:[id(999)]}}));assert.equal(r.status,409);assert.ok(!(await r.text()).includes(id(999)));
});
test("request owner manipulation, extra fields, invalid scope/filters and duplicate IDs are rejected",async()=>{
 for(const body of [
  {action:"preview",owner_id:B,selection:{scope:"all"}},
  {action:"preview",selection:{scope:"all",owner_id:B}},
  {action:"preview",selection:{scope:"selected",ids:[id(1),id(1)]}},
  {action:"preview",selection:{scope:"filtered",filters:{segment:"foreign",owner_id:B}}},
  {action:"preview",selection:{scope:"all;drop table contacts"}},
 ])assert.equal((await handler(request(body))).status,400);
 assert.ok(ownerCalls.every(x=>x===A));
});
test("unauthenticated and cross-origin requests never read contacts",async()=>{
 let read=false;
 const noAuth=createContactExportHandler({requireOwnerId:async()=>{throw Error("Unauthorized");},readContacts:async()=>{read=true;return [];}});
 assert.equal((await noAuth(request({action:"preview",selection:{scope:"all"}}))).status,401);assert.equal(read,false);
 assert.equal((await handler(request({action:"preview",selection:{scope:"all"}},{Origin:"https://evil.test"}))).status,403);
});
test("foreign owner rows returned by a compromised dependency fail closed",async()=>{
 const h=createContactExportHandler({requireOwnerId:async()=>A,readContacts:async()=>[contact(1,{owner_id:B})]});
 assert.equal((await h(request({action:"preview",selection:{scope:"all"}}))).status,503);
});
test("CSV formulas, whitespace-prefixed formulas, quotes, commas and multiline values are safe",()=>{
 for(const s of ["=1+1","+SUM(A1)","-1+2","@SUM(A1)"," \t=cmd()","\r=bad","\n@bad","\ufeff=bad"]){
 const parsed=Papa.parse<string[]>(csvCell(s)).data[0][0];assert.ok(parsed.startsWith("'"));
 }
 const s='Line 1, "quoted"\r\nLine 2';assert.equal(Papa.parse<string[]>(csvCell(s)).data[0][0],s);
 assert.equal(Papa.parse<string[]>(csvCell("00501",true)).data[0][0],"'00501");
});
test("contact changes require fresh count confirmation and never modify records",async()=>{
 const before=JSON.stringify(rows);const p=await (await handler(request({action:"preview",selection:{scope:"all"}}))).json();
 const invalid=await handler(request({action:"download",selection:{scope:"selected",ids:[id(1)]},expectedCount:p.count,fingerprint:p.fingerprint}));assert.equal(invalid.status,409);
 assert.equal(JSON.stringify(rows),before);
});
test("database failures produce generic errors without leaking rows or SQL",async()=>{
 const h=createContactExportHandler({requireOwnerId:async()=>A,readContacts:async()=>{throw Error("SECRET DATABASE");}});
 const r=await h(request({action:"preview",selection:{scope:"all"}}));assert.equal(r.status,503);assert.ok(!(await r.text()).includes("SECRET DATABASE"));
});
test("pagination exports more than 1,000 rows with every page owner-scoped, no writes and no truncation",async()=>{
 const large=Array.from({length:1253},(_,i)=>contact(i+1));const ranges:number[][]=[],owners:string[]=[];
 const database={from(table:string){assert.equal(table,"contacts");let start=0,end=0;return {select(){return this;},eq(k:string,v:string){assert.equal(k,"owner_id");owners.push(v);return this;},order(){return this;},range(a:number,b:number){start=a;end=b;ranges.push([a,b]);return Promise.resolve({data:large.slice(start,end+1),error:null,count:large.length});}};}};
 const snapshot=await readContactSnapshot(database as never,A);assert.equal(snapshot.length,1253);assert.equal(ranges.length,3);assert.ok(owners.every(x=>x===A));
 const h=createContactExportHandler({requireOwnerId:async()=>A,readContacts:async()=>snapshot});const p=await(await h(request({action:"preview",selection:{scope:"all"}}))).json();const r=await h(request({action:"download",selection:{scope:"all"},expectedCount:p.count,fingerprint:p.fingerprint}));
 assert.equal(Papa.parse(await r.text(),{header:true,skipEmptyLines:true}).data.length,1253);
});
test("export whitelist never includes IDs, notes, secrets or consent proof",()=>{for(const c of CSV_COLUMNS)assert.ok(!/^(id|owner|notes|proof|token|api)/i.test(c[0]));assert.ok(!csvRow(rows[0]).includes("SECRET"));});

test("changed contact data invalidates confirmation even when count is unchanged",async()=>{
 const selection={scope:"all"};const p=await(await handler(request({action:"preview",selection}))).json();const old=rows;
 try{rows=rows.map((r,i)=>i? r:{...r,first_name:"Changed safely"});const r=await handler(request({action:"download",selection,expectedCount:p.count,fingerprint:p.fingerprint}));assert.equal(r.status,409);}
 finally{rows=old;}
});
