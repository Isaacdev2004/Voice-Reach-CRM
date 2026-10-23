/* Execute actual route modules with only authentication, database and service boundaries replaced. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const owner = 'subscriber-a';
const contactId = '00000000-0000-4000-8000-000000000001';
const foreignId = '00000000-0000-4000-8000-000000000002';
const noteId = '00000000-0000-4000-8000-000000000003';

function fixture() {
  const tables = {
    contacts: [{id:contactId,owner_id:owner,first_name:'Actual',phone:'+15555550101',type:'Cold Lead',category:'Luxury',consent_records:[]},
      {id:foreignId,owner_id:'subscriber-b',first_name:'Private',phone:'+15555550102',consent_records:[]}],
    contact_notes: [], consent_records: []
  };
  const calls = [];
  let failUpdates = false;
  let missingPreferences = false;
  const database = { from(table) {
    const filters = []; let action = 'select'; let payload; let single = false; let range; let countExact = false;
    const query = {
      select(_columns, options){countExact ||= options?.count === 'exact';return query;},
      eq(key,value){filters.push(row=>row[key]===value);calls.push({table,key,value});return query;},
      ilike(key,value){const literal=value.replace(/\\([\\%_])/g,'$1');filters.push(row=>(row[key]||'').toLowerCase()===literal.toLowerCase());return query;},
      order(){return query;},limit(){return query;},
      range(start,end){range=[start,end];return query;},
      maybeSingle(){single=true;return query;},single(){single=true;return query;},
      insert(value){action='insert';payload=value;return query;},
      update(value){action='update';payload=value;return query;},
      delete(){action='delete';return query;},
      then(resolve,reject){return Promise.resolve().then(()=>{
        if(missingPreferences && action==='update' && Object.keys(payload).some(key=>['preferred_sqft','preferred_beds','preferred_baths','preferred_garage_spaces','preferred_lot_sqft','preferred_property_type'].includes(key)))return {data:null,error:{code:'PGRST204',message:'private schema column detail'}};
        if(failUpdates && action==='update')return {data:null,error:{message:'private database detail'}};
        let matching=tables[table].filter(row=>filters.every(filter=>filter(row)));
        const count=matching.length;
        if(action==='insert'){
          matching=(Array.isArray(payload)?payload:[payload]).map(row=>({id:noteId,created_at:'2026-10-22',updated_at:'2026-10-22T12:00:00.000Z',...row}));tables[table].push(...matching);
        }else if(action==='update'){for(const row of matching)Object.assign(row,payload);}
        else if(action==='delete')tables[table]=tables[table].filter(row=>!matching.includes(row));
        if(range)matching=matching.slice(range[0],range[1]+1);
        return {data:single?matching[0]||null:matching,error:null,count:countExact?count:null};
      }).then(resolve,reject);}
    };return query;
  }};
  const stubs = {
    '@/lib/auth': {requireUserId:async()=>owner},
    '@/lib/supabaseAdmin': {supabaseAdmin:database},
    '@/lib/audit': {writeAuditLog:async()=>{}},
    '@/lib/automations/engine': {evaluateTriggers:async()=>{}},
    '@/lib/billing/plan-limits': {assertCanAddContacts:async()=>({ok:true})},
    '@/lib/billing/settings-store': {loadSavedSettings:async()=>({contactCategories:['Residential','Commercial','Luxury']})}
  };
  const cache = new Map();
  function load(file) {
    file=path.resolve(root,file);if(!path.extname(file))file+='.ts';
    if(cache.has(file))return cache.get(file).exports;
    const loadedModule={exports:{}};cache.set(file,loadedModule);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    const localRequire=id=>Object.hasOwn(stubs,id)?stubs[id]:id.startsWith('@/')?load(id.slice(2)):id.startsWith('.')?load(path.resolve(path.dirname(file),id)):require(id);
    new Function('require','module','exports',code)(localRequire,loadedModule,loadedModule.exports);
    return loadedModule.exports;
  }
  return {load,tables,calls,failUpdates:()=>{failUpdates=true;},missingPreferences:()=>{missingPreferences=true;}};
}
const context = id=>({params:Promise.resolve({id})});
const request = (url,method='GET',body)=>new Request('http://test'+url,{method,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});

test('actual Add, profile edit and delete routes use authenticated owner and reject foreign contacts',async()=>{
  const f=fixture();const create=f.load('app/api/contacts/route.ts');
  const response=await create.POST(request('/api/contacts','POST',{firstName:'New',phone:'5555550105',type:'Custom Buyer',category:'Luxury',owner_id:'subscriber-b'}));
  assert.equal(response.status,201);
  assert.equal(f.tables.contacts.at(-1).owner_id,owner);
  assert.equal(f.tables.contacts.at(-1).category,'Luxury');
  const route=f.load('app/api/contacts/[id]/route.ts');
  assert.equal((await route.GET(request('/api/contacts/'+foreignId),context(foreignId))).status,404);
  assert.equal((await route.PATCH(request('/api/contacts/'+foreignId,'PATCH',{type:'Active Lead'}),context(foreignId))).status,404);
  const patch=await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{type:'Active Lead',firstName:'Updated'}),context(contactId));
  assert.equal(patch.status,200);assert.equal(f.tables.contacts[0].type,'Active Lead');
  assert.equal((await route.DELETE(request('/api/contacts/'+foreignId,'DELETE'),context(foreignId))).status,404);
  assert.equal((await route.DELETE(request('/api/contacts/'+contactId,'DELETE'),context(contactId))).status,200);
  assert.ok(f.tables.contacts.some(row=>row.id===foreignId));
});

test('actual CSV import preserves categories and types without granting consent from the filename',async()=>{
  const f=fixture();const form=new FormData();form.set('file',new File(['firstName,phone,type,category,source\nImported,5555550199,Custom Buyer,Luxury,Referral'],'consent-valid.csv',{type:'text/csv'}));
  const response=await f.load('app/api/contacts/import/route.ts').POST(new Request('http://test/api/contacts/import',{method:'POST',body:form}));
  assert.equal(response.status,200);assert.equal((await response.json()).imported,1);
  assert.equal(f.tables.contacts.at(-1).owner_id,owner);assert.equal(f.tables.contacts.at(-1).category,'Luxury');
  assert.equal(f.tables.contacts.at(-1).type,'Custom Buyer');assert.notEqual(f.tables.consent_records.at(-1).status,'Yes');
});

test('actual note save/read/relink routes persist data and prevent cross-account associations',async()=>{
  const f=fixture();const notes=f.load('app/api/notes/route.ts');
  assert.equal((await notes.POST(request('/api/notes','POST',{contactId:foreignId,body:'Must reject'}))).status,404);
  assert.equal((await notes.GET(request('/api/notes?contactId='+foreignId))).status,404);
  assert.equal((await notes.POST(request('/api/notes','POST',{contactId,body:'Actual relationship context'}))).status,201);
  const loaded=await notes.GET(request('/api/notes?contactId='+contactId));
  assert.equal((await loaded.json()).notes[0].body,'Actual relationship context');
  const patch=f.load('app/api/notes/[id]/route.ts');
  assert.equal((await patch.PATCH(request('/api/notes/'+noteId,'PATCH',{contactId:foreignId}),context(noteId))).status,404);
  assert.equal(f.tables.contact_notes[0].contact_id,contactId);
  assert.equal((await patch.PATCH(request('/api/notes/'+noteId,'PATCH',{body:'Updated context'}),context(noteId))).status,200);
  assert.equal((await (await notes.GET(request('/api/notes?contactId='+contactId))).json()).notes[0].body,'Updated context');
});

test('actual category counts use the shared category rule; failed rename/remove never report success',async()=>{
  const f=fixture();f.tables.contacts.push({id:'legacy',owner_id:owner,type:'Residential Lead',category:null});
  const route=f.load('app/api/contacts/categories/route.ts');
  const result=await (await route.GET(request('/api/contacts/categories'))).json();
  assert.equal(result.counts.all,2);assert.equal(result.counts.residential,1);assert.equal(result.counts.luxury,1);
  f.failUpdates();
  for(const body of [{action:'rename',from:'Luxury',to:'Investors'},{action:'remove',name:'Luxury'}]){
    const response=await route.POST(request('/api/contacts/categories','POST',body));assert.equal(response.status,503);assert.ok(!JSON.stringify(await response.json()).includes('private database detail'));
  }
});

test('property preferences persist on the existing contact and cannot write another subscriber or unknown columns',async()=>{
  const f=fixture();const route=f.load('app/api/contacts/[id]/route.ts');
  const preferences={squareFeet:1800,beds:3,baths:2.5,garageSpaces:0,lotSquareFeet:5000,propertyType:'Condo'};
  const save=()=>route.PATCH(request('/api/contacts/'+contactId,'PATCH',{preferredArea:'Winter Park, FL',budget:850000,propertyPreferences:preferences}),context(contactId));
  assert.equal((await save()).status,200);assert.equal((await save()).status,200);assert.equal(f.tables.contacts.length,2,'saving updates the same row without duplicates');
  assert.equal(f.tables.contacts[0].preferred_sqft,1800);assert.equal(f.tables.contacts[0].preferred_beds,3);assert.equal(f.tables.contacts[0].preferred_baths,2.5);assert.equal(f.tables.contacts[0].preferred_garage_spaces,0);assert.equal(f.tables.contacts[0].preferred_lot_sqft,5000);assert.equal(f.tables.contacts[0].preferred_property_type,'Condo');
  assert.equal((await route.PATCH(request('/api/contacts/'+foreignId,'PATCH',{propertyPreferences:preferences}),context(foreignId))).status,404);assert.equal(f.tables.contacts[1].preferred_beds,undefined);
  assert.equal((await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{propertyPreferences:{beds:-1}}),context(contactId))).status,400);
  assert.equal((await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{propertyPreferences:{owner_id:'subscriber-b'}}),context(contactId))).status,400);
  assert.equal((await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{propertyPreferences:{beds:null}}),context(contactId))).status,200);assert.equal(f.tables.contacts[0].preferred_beds,null);assert.equal(f.tables.contacts[0].preferred_baths,2.5);
});

test('uninstalled optional columns fail safely while old area/budget saves continue to work',async()=>{
  const f=fixture();f.missingPreferences();const route=f.load('app/api/contacts/[id]/route.ts');
  let response=await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{preferredArea:'Orlando',budget:500000}),context(contactId));assert.equal(response.status,200);
  response=await route.PATCH(request('/api/contacts/'+contactId,'PATCH',{preferredArea:'Changed',propertyPreferences:{beds:3}}),context(contactId));assert.equal(response.status,503);const result=await response.json();assert.equal(result.code,'property_preferences_unavailable');assert.ok(!result.error.includes('private schema column detail'));assert.equal(f.tables.contacts[0].preferred_area,'Orlando');
});
