// Isolated fixture data; no requests reach a live application service.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {DashboardShell} from '../../components/layout/dashboard-shell';
import {RelationshipProfilePage} from '../../components/pages/stitch/RelationshipProfilePage';
import {PropertyFinderPage} from '../../components/pages/stitch/PropertyFinderPage';
import {DEFAULT_SETTINGS} from '../../lib/settings/defaults';
import {contactMetricCounts} from '../../lib/contacts/metrics';
const w=window;
w.__owner='owner_a';w.__setOwner=owner=>{w.__owner=owner;window.dispatchEvent(new Event('review:auth'));};
w.__records=Array.from({length:5},(_,i)=>({id:`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,owner_id:'owner_a',first_name:`Client ${String(i+1).padStart(2,'0')}`,last_name:'QA',phone:`+1555555010${i+1}`,email:`client${i+1}@example.test`,type:i===3?'Commercial Lead':'Active Lead',preferred_area:i<4?['Winter Park, FL','Orlando, FL','Lake Nona, FL','Longwood, FL'][i]:null,budget:i<4?[850000,650000,1200000,700000][i]:null,consent_records:[]}));
w.__records.push({id:'00000000-0000-4000-8000-000000000050',owner_id:'owner_b',first_name:'Separate',last_name:'Subscriber',phone:'+15555550102',consent_records:[]});
w.__records[0].preferred_sqft=1800;w.__records[0].preferred_beds=3;w.__records[0].preferred_baths=2.5;w.__records[0].preferred_garage_spaces=2;w.__records[0].preferred_lot_sqft=5000;w.__records[0].preferred_property_type='Condo';
w.__records[4].preferred_beds=0;
w.__records=JSON.parse(sessionStorage.getItem('property-qa-records')||'null')||w.__records;
w.__history=[];
w.__tasks=JSON.parse(sessionStorage.getItem('property-qa-tasks')||'[]');w.__requests=[];
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
w.fetch=async(input,init={})=>{
 const url=new URL(String(input),location.origin);const method=init.method||'GET';w.__requests.push({path:url.pathname,method});
 const owned=w.__records.filter(record=>record.owner_id===w.__owner);
 if(url.pathname==='/api/contacts'&&method==='GET'){
  if(w.__failContacts)return response({success:false,error:'private service detail'},503);
  return response({success:true,complete:true,contacts:structuredClone(owned),total:owned.length,filtered:owned.length,counts:contactMetricCounts(owned),categories:['Residential','Commercial']});
 }
 if(/^\/api\/contacts\/[a-f0-9-]{36}$/.test(url.pathname)&&method==='PATCH'){
  const contact=owned.find(record=>record.id===url.pathname.split('/').at(-1));if(!contact)return response({success:false,error:'Not found'},404);
  if(w.__failSave)return response({success:false,error:'private database detail'},500);
  const body=JSON.parse(init.body);if(w.__delaySave)await new Promise(resolve=>{w.__finishSave=resolve;});if(w.__missingPrefs&&body.propertyPreferences)return response({success:false,code:'property_preferences_unavailable',error:'private schema detail'},503);if(body.propertyPreferences){const columns={squareFeet:'preferred_sqft',beds:'preferred_beds',baths:'preferred_baths',garageSpaces:'preferred_garage_spaces',lotSquareFeet:'preferred_lot_sqft',propertyType:'preferred_property_type'};for(const [key,value] of Object.entries(body.propertyPreferences))contact[columns[key]]=value;}if('preferredArea'in body)contact.preferred_area=body.preferredArea;if('budget'in body)contact.budget=body.budget;
  sessionStorage.setItem('property-qa-records',JSON.stringify(w.__records));return response({success:true,contact});
 }
 const contactMatch=url.pathname.match(/^\/api\/contacts\/([a-f0-9-]{36})$/);if(contactMatch&&method==='GET'){const contact=owned.find(record=>record.id===contactMatch[1]);return contact?response({success:true,contact}):response({success:false,error:'Not found'},404);}
 if(url.pathname==='/api/property-finder/history'){if(w.__failHistory)return response({success:false,error:'private history detail'},503);if(method==='POST'){const body=JSON.parse(init.body);w.__history.push({id:body.eventId,owner_id:w.__owner,entity_id:body.contactId,metadata:{kind:body.kind,url:body.url},created_at:new Date().toISOString()});return response({success:true,recorded:true});}return response({success:true,entries:w.__history.filter(row=>row.owner_id===w.__owner)});}
 if(url.pathname==='/api/ai/generate'){w.__aiRequest=JSON.parse(init.body);return response({success:true,data:{provider:'synthetic-test',task:'next_best_action',output:{recommendation:'Confirm preferred neighborhoods before refining the Zillow search.',reason:'Only the client preferences supplied by this fixture are available.',suggestedChannel:'email'}}});}
 if(url.pathname==='/api/notes')return response({success:true,notes:[]});
 if(url.pathname==='/api/engagement')return response({success:true,data:{events:[],score:null}});
 if(url.pathname==='/api/tasks')return response({success:true,tasks:w.__tasks.filter(task=>task.owner_id===w.__owner)});
 const taskMatch=url.pathname.match(/^\/api\/contacts\/([a-f0-9-]{36})\/tasks$/);
 if(taskMatch){if(!owned.some(record=>record.id===taskMatch[1]))return response({success:false,error:'Not found'},404);if(method==='POST'){const body=JSON.parse(init.body);const task={id:'00000000-0000-4000-8000-000000000090',owner_id:w.__owner,contact_id:taskMatch[1],title:body.title,due_at:body.dueAt,completed:false};w.__tasks.push(task);sessionStorage.setItem('property-qa-tasks',JSON.stringify(w.__tasks));return response({success:true,task},201);}return response({success:true,tasks:w.__tasks.filter(task=>task.owner_id===w.__owner&&task.contact_id===taskMatch[1])});}
 if(url.pathname==='/api/campaigns')return response({success:true,campaigns:[]});
 if(url.pathname==='/api/settings')return response({settings:{...DEFAULT_SETTINGS,billing:{...DEFAULT_SETTINGS.billing,subscriptionStatus:'active'}}});
 if(url.pathname==='/api/health')return response({status:'ok',supabase:true,clerk:true});
 return response({success:false,error:'Endpoint not part of the fixture'},404);
};
w.open=(url)=>{w.__openedSearch=url;return null;};
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{if(w.__failClipboard)throw new Error('Denied');w.__copiedLink=value;}}});
const profileId=location.pathname.match(/^\/dashboard\/contacts\/([^/]+)$/)?.[1];
createRoot(document.getElementById('root')).render(<DashboardShell>{location.pathname==='/dashboard/properties'?<PropertyFinderPage/>:profileId?<RelationshipProfilePage contactId={profileId}/>:<p>Existing related workflow</p>}</DashboardShell>);
