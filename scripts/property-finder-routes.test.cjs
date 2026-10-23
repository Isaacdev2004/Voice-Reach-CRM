// Real route handlers, isolated synthetic database; no provider/database network calls.
const assert = require('node:assert/strict');
const {fixture} = require('./campaign-audit/harness.cjs');
(async () => {
 const f=fixture(), route=f.load('app/api/property-finder/history/route.ts');
 f.tables.contacts.push({id:f.id(21),owner_id:f.owner},{id:f.id(22),owner_id:'foreign'});
 const post = body=>route.POST(new Request('http://localhost/api/property-finder/history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 const body={eventId:f.id(31),contactId:f.id(21),kind:'link_copied',url:'https://www.zillow.com/homes/for_sale/orlando-fl/0-650000_price/'};
 assert.equal((await post(body)).status,200);
 assert.equal((await post(body)).status,200);
 assert.equal(f.tables.audit_logs.length,1,'retries do not duplicate history');
 assert.equal((await post({...body,kind:'search_requested'})).status,409,'same event cannot be rewritten');
 assert.equal((await post({...body,eventId:f.id(32),contactId:f.id(22)})).status,404);
 for(const url of ['https://zillow.com.evil.test/homes/for_sale/','javascript:alert(1)','https://www.zillow.com/homes/for_sale/?redirect=secret','https://www.zillow.com:8443/homes/for_sale/'])assert.equal((await post({...body,eventId:f.id(32),url})).status,400);
 assert.equal((await post({...body,owner_id:'foreign'})).status,400);
 const entries=(await (await route.GET()).json()).entries;
 assert.equal(entries.length,1);assert.equal(entries[0].entity_id,f.id(21));
 f.actor('foreign');assert.equal((await (await route.GET()).json()).entries.length,0);
 assert.equal((await post({...body,contactId:null})).status,200,'event ids scoped to authenticated owner');
 f.actor(f.owner);assert.equal((await (await route.GET()).json()).entries.length,1);
 const timeline=await f.load('lib/activity/read-model').readContactActivity(f.owner,f.id(21),null);assert.equal(timeline.items.filter(item=>item.id.startsWith('property-search:')).length,1);assert.ok(JSON.stringify(timeline).includes('Sending, delivery and client views are not inferred.'));
 f.fail('audit_logs');const failed=await route.GET();assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('private'));
 f.fail(null);const db=f.stubs['@/lib/supabaseAdmin'].supabaseAdmin;const original=db.from;db.from=()=>{throw Error('private connection credentials');};const unavailable=await route.GET();assert.equal(unavailable.status,503);assert.ok(!(await unavailable.text()).includes('private'));db.from=original;
 const malformed=await route.POST(new Request('http://localhost/api/property-finder/history',{method:'POST',body:'{malformed'}));assert.equal(malformed.status,400);
 f.actor(null);assert.equal((await route.GET()).status,401);assert.equal((await post(body)).status,401);
 console.log('Property Finder history: tenant ownership, canonical URLs, duplicate retries, conflict, auth and safe errors passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
