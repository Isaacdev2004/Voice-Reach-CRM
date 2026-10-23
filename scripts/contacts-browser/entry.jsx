// Isolated, in-memory UI fixtures. No real API requests or database writes are possible here.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {DashboardShell} from '../../components/layout/dashboard-shell';
import {DEFAULT_SETTINGS} from '../../lib/settings/defaults';
import {RelationshipProfilePage} from '../../components/pages/stitch/RelationshipProfilePage';
import {ContactManagementPage} from '../../components/pages/stitch/ContactManagementPage';
import {contactMetricCounts} from '../../lib/contacts/metrics';
import {mergeCategoryLists,categoriesUsedOnContacts} from '../../lib/contacts/categories';

const w=window;
w.__owner='owner_a';
w.__setOwner=owner=>{w.__owner=owner;window.dispatchEvent(new Event('review:auth'));};
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
w.__records=Array.from({length:32},(_,i)=>({id:id(i+1),owner_id:'owner_a',first_name:`Contact ${String(i+1).padStart(2,'0')}`,last_name:'Fixture',phone:'+15555550101',email:`contact${i+1}@example.test`,type:i===0?'Custom Buyer':i===1?'Active Lead':i===2?'Past Client':'Cold Lead',source:i%2?'Website':'Referral',category:i===0?'Luxury':i%2?'Commercial':'Residential',last_contacted:i===0?new Date(Date.now()-86400000).toISOString():null,tags:i===0?['Investor']:[],dnc:false,consent_records:i===0?[{status:'No',created_at:'2026-01-01'},{status:'Yes',created_at:'2026-02-01'}]:[],created_at:new Date(1700000000000+i*86400000).toISOString()}));
w.__records.push({id:id(50),owner_id:'owner_b',first_name:'Private B',phone:'+15555550102',type:'Past Client',consent_records:[]});
w.__notes=[];w.__requests=[];w.__categories=['Residential','Commercial','Luxury'];
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
w.fetch=async(input,init={})=>{
 const url=new URL(String(input),location.origin);const method=init.method||'GET';
 w.__requests.push({path:url.pathname,query:url.search,method});
 const own=w.__records.filter(record=>record.owner_id===w.__owner);
 if(url.pathname==='/api/contacts' && method==='GET'){
  const records=structuredClone(own);if(w.__delay)await new Promise(resolve=>setTimeout(resolve,200));
  return response({success:true,complete:true,contacts:records,total:records.length,filtered:records.length,counts:contactMetricCounts(records),categories:mergeCategoryLists(w.__categories,categoriesUsedOnContacts(records))});
 }
 if(url.pathname==='/api/contacts' && method==='POST'){
  const data=JSON.parse(init.body);const contact={id:id(100),owner_id:w.__owner,first_name:data.firstName,last_name:data.lastName,phone:data.phone,type:data.type,category:data.category,source:data.source,consent_records:[]};w.__records.push(contact);return response({success:true,contact},201);
 }
 if(url.pathname==='/api/contacts/bulk' && method==='POST'){
  const body=JSON.parse(init.body);if(body.ids.some(id=>!own.some(record=>record.id===id)))return response({success:false,error:'Not found'},404);
  const matching=own.filter(record=>body.ids.includes(record.id));
  if(body.action==='delete')w.__records=w.__records.filter(record=>!matching.includes(record));
  for(const record of matching){if(body.action==='set_type')record.type=body.type;if(body.action==='set_category')record.category=body.category;if(body.action==='set_consent')record.consent_records.push({status:body.consent,created_at:new Date().toISOString()});}
  return response({success:true,updated:matching.length,deleted:matching.length});
 }
 if(url.pathname==='/api/contacts/categories'){
  if(method==='POST'){const body=JSON.parse(init.body);if(body.action==='add')w.__categories.push(body.name);if(body.action==='rename'){w.__categories=w.__categories.map(name=>name===body.from?body.to:name);for(const record of own)if(record.category===body.from)record.category=body.to;}if(body.action==='remove'){w.__categories=w.__categories.filter(name=>name!==body.name);for(const record of own)if(record.category===body.name)record.category=null;}}
  return response({success:true,categories:w.__categories});
 }
 if(url.pathname==='/api/contacts/import'&&method==='POST'){
  const file=init.body.get('file');const text=await file.text();if(!text.includes('CSV Fixture'))return response({success:false,error:'Invalid fixture'},400);
  w.__records.push({id:id(101),owner_id:w.__owner,first_name:'CSV Fixture',phone:'+15555550101',type:'Cold Lead',category:'Residential',consent_records:[]});return response({success:true,imported:1,errors:[]});
 }
 const contactMatch=url.pathname.match(/^\/api\/contacts\/([a-f0-9-]{36})$/);
 if(contactMatch){
  const contact=own.find(record=>record.id===contactMatch[1]);
  if(!contact)return response({success:false,error:'Contact not found'},404);
  if(method==='PATCH'){const body=JSON.parse(init.body);Object.assign(contact,{first_name:body.firstName,last_name:body.lastName,phone:body.phone,email:body.email,type:body.type,source:body.source,notes:body.notes,dnc:body.dnc});}
  if(method==='DELETE')w.__records=w.__records.filter(record=>record!==contact);
  return response({success:true,contact});
 }
 if(url.pathname.endsWith('/tasks'))return response({success:true,tasks:[]});
 if(url.pathname==='/api/notes'){
  if(method==='POST'){if(w.__failNotes)return response({success:false,error:'private details'},500);const body=JSON.parse(init.body);w.__notes.push({id:id(200),owner_id:w.__owner,contact_id:body.contactId,body:body.body,created_at:new Date().toISOString()});return response({success:true,note:w.__notes.at(-1)},201);}
  return response({success:true,notes:w.__notes.filter(note=>note.owner_id===w.__owner&&note.contact_id===url.searchParams.get('contactId'))});
 }
 if(url.pathname==='/api/settings')return response({settings:{...DEFAULT_SETTINGS,billing:{...DEFAULT_SETTINGS.billing,subscriptionStatus:'active'}}});
 if(url.pathname==='/api/health')return response({status:'ok',supabase:true,clerk:true});
 if(url.pathname==='/api/engagement')return response({success:true,data:{events:[],score:null}});
 if(url.pathname==='/api/contacts/relationship-pulse')return response({success:true,data:{lanes:[],conciergeHint:'',generatedAt:new Date().toISOString()}});
 if(url.pathname==='/api/compliance/summary')return response({success:true,contacts:[],total:0});
 return response({success:false,error:'Unstubbed endpoint'},404);
};
const profileId=location.pathname.match(/^\/dashboard\/contacts\/([^/]+)$/)?.[1];
createRoot(document.getElementById('root')).render(<DashboardShell>{profileId?<RelationshipProfilePage contactId={profileId}/>:<ContactManagementPage/>}</DashboardShell>);
