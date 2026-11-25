const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,owner,id}=require('./campaign-audit/harness.cjs');
function setup(){process.env.CONCIERGE_ENABLED='true';process.env.CONCIERGE_OWNER_IDS=owner+',other';const f=fixture();f.tables.audit_logs=[];f.tables.concierge_cases=[];f.stubs['@/lib/audit']={writeAuditLog:async p=>{const r=await f.stubs['@/lib/supabaseAdmin'].supabaseAdmin.from('audit_logs').insert({owner_id:p.ownerId,action:p.action,entity_type:p.entityType,metadata:p.metadata});if(r.error)throw r.error;}};f.stubs['@/lib/concierge/status']={caseFacts:async()=>({facts:{imported:false,campaignDraft:false,integrationsVerified:false}})};return f;}
const get=()=>new Request('http://localhost/api/concierge/welcome');
const post=(body,origin)=>new Request('http://localhost/api/concierge/welcome',{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(body)});
test('welcome dismissal persists per owner without creating cases, contacts or changing signoff',async()=>{
 const f=setup(),r=f.load('app/api/concierge/welcome/route');
 assert.equal((await (await r.GET(get())).json()).showWelcome,true);
 assert.equal((await r.POST(post({action:'explore'}))).status,200);
 assert.equal((await (await r.GET(get())).json()).showWelcome,false);
 assert.equal(f.tables.concierge_cases.length,0);assert.equal(f.tables.contacts.length,0);
 assert.equal(f.tables.audit_logs[0].owner_id,owner);
 assert.equal((await r.POST(post({action:'explore'}))).status,200);assert.equal(f.tables.audit_logs.length,1);
 f.actor('other');assert.equal((await (await r.GET(get())).json()).showWelcome,true);
 f.actor('unauthorized');assert.equal((await r.GET(get())).status,404);
});
test('preference requests cannot forge owners, mutate milestones or use another origin',async()=>{
 const f=setup(),r=f.load('app/api/concierge/welcome/route');
 assert.equal((await r.POST(post({action:'begin',owner:'other'}))).status,400);
 assert.equal((await r.POST(post({action:'staffSignoff'}))).status,400);
 assert.equal((await r.POST(post({action:'begin'},'https://unrelated.test'))).status,403);
 assert.equal(f.tables.audit_logs.length,0);
});
test('completed checklist needs independent current manager signoff; completion acknowledgement suppresses future reminders',async()=>{
 const f=setup();f.stubs['@/lib/concierge/status']={caseFacts:async()=>({facts:{imported:true,campaignDraft:true,integrationsVerified:true}})};
 const c={owner_id:owner,version:4,discovery:{agentName:'Synthetic Agent',market:'Orlando',goals:'Thoughtful follow-up'},milestones:{stagesReviewed:true,campaignReviewed:true,launchReview:true,training:['dashboard','contacts','campaigns','calendar','tasks','notes','reporting'],staffReview:{actor:'manager',reviewedVersion:3}},created_at:new Date().toISOString()};
 f.tables.concierge_cases=[c];const r=f.load('app/api/concierge/welcome/route');
 let d=await (await r.GET(get())).json();assert.equal(d.complete,false);assert.equal(d.showWelcome,false);assert.match(d.next,/manager/);
 c.milestones.staffReview.reviewedVersion=4;
 d=await (await r.GET(get())).json();assert.equal(d.complete,true);assert.equal(d.showCard,true);
 await r.POST(post({action:'acknowledgeCompletion'}));d=await (await r.GET(get())).json();assert.equal(d.showCard,false);assert.equal(c.version,4);
});
test('resume destination maps every actual incomplete milestone to its journey step',()=>{
 const {journeyHref}=fixture().load('lib/concierge/journey');
 assert.match(journeyHref('discovery'),/step=discovery/);assert.match(journeyHref('campaign'),/step=campaigns/);assert.match(journeyHref('training'),/step=training/);assert.match(journeyHref('stages'),/step=review/);
});
test('orientation evidence is owner scoped and reveals existence only; unrelated accounts denied',async()=>{
 const f=setup();f.tables.contacts=[{id:'own-contact',owner_id:owner},{id:'other-contact',owner_id:'other'}];f.tables.contact_notes=[{id:'other-note',owner_id:'other'}];f.tables.tasks=[{id:'own-task',owner_id:owner}];
 const route=f.load('app/api/concierge/orientation/route'),request=new Request('http://localhost/api/concierge/orientation');
 const data=await (await route.GET(request)).json();assert.equal(data.contacts,true);assert.equal(data.contact_notes,false);assert.equal(data.tasks,true);assert.equal(JSON.stringify(data).includes('own-contact'),false);
 f.actor('other');const other=await(await route.GET(request)).json();assert.equal(other.contact_notes,true);assert.equal(other.tasks,false);
 f.actor('unauthorized');assert.equal((await route.GET(request)).status,404);
});
test('journey status never calls skipped integrations verified',()=>{
 const {journeyStatus}=fixture().load('lib/concierge/journey');const checks=[{key:'integrations',done:true}];
 assert.equal(journeyStatus('integrations',checks,{integrationsNotApplicable:true},{imported:false,integrationsVerified:false}),'Intentionally skipped');
 assert.equal(journeyStatus('integrations',checks,{}, {imported:false,integrationsVerified:true}),'Verified');
 assert.equal(journeyStatus('integrations',[],{connectionReview:{calendar:false,sms:false}},{imported:false,integrationsVerified:false}),'Needs attention');
});
