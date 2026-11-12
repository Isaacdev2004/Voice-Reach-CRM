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
