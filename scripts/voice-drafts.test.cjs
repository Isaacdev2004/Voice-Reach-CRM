/* Real handlers and synthetic storage only: no production auth/data/provider calls. */
const {test}=require('node:test'),assert=require('node:assert/strict');
const {fixture,id,owner}=require('./campaign-audit/harness.cjs');
function setup(error){const f=fixture();f.tables.voice_script_drafts=[];
 if(error){const db=f.stubs['@/lib/supabaseAdmin'].supabaseAdmin,from=db.from.bind(db);db.from=table=>{if(table!=='voice_script_drafts')return from(table);let q;return q=new Proxy({then:resolve=>Promise.resolve(resolve({data:null,error:{code:error,message:'private database trace'}}))},{get:(obj,key)=>obj[key]||(()=>q)});};}
 const r=f.load('app/api/voice-studio/drafts/route');return {f,r,save:body=>r.PUT(new Request('http://qa/api/voice-studio/drafts',{method:'PUT',body:JSON.stringify(body)}))};}
const payload={id:id(10),title:'Owned follow-up',script:'A real synthetic script to review.',expectedRevision:null};
test('cloud drafts persist, support idempotent retries, reject stale changes and isolate subscribers',async()=>{
 const {f,r,save}=setup();const created=await save(payload);assert.equal(created.status,200);const first=(await created.json()).draft;assert.ok(first.revision);
 assert.equal((await (await save(payload)).json()).draft.revision,first.revision);
 const updated=(await (await save({...payload,script:'Updated words.',expectedRevision:first.revision})).json()).draft;assert.notEqual(updated.revision,first.revision);
 assert.equal((await save({...payload,title:'Stale overwrite',expectedRevision:first.revision})).status,409);
 assert.equal((await (await r.GET()).json()).drafts[0].script,'Updated words.');
 f.actor('foreign');assert.deepEqual((await (await r.GET()).json()).drafts,[]);assert.equal((await save({...payload,title:'Stolen'})).status,409);assert.equal(f.tables.voice_script_drafts[0].owner_id,owner);
 const mismatched=await r.PUT(new Request('http://qa/drafts',{method:'PUT',headers:{'X-MyARI-Owner':owner},body:JSON.stringify({...payload,id:id(90)})}));assert.equal(mismatched.status,409);assert.equal(f.tables.voice_script_drafts.length,1);
 f.actor(null);assert.equal((await r.GET()).status,401);assert.equal((await save(payload)).status,401);
});
test('concurrent editors cannot overwrite each other after reading the same revision',async()=>{
 const {r,save}=setup();const first=(await (await save(payload)).json()).draft;
 const responses=await Promise.all(['One','Two'].map(title=>save({...payload,title,expectedRevision:first.revision})));
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal((await (await r.GET()).json()).drafts.length,1);
});
test('missing optional draft table uses private owner documents, remains readable after migration and never transfers foreign ids',async()=>{
 const {f,r,save}=setup('42P01');const first=(await (await save(payload)).json()).draft;assert.ok(first.revision);assert.equal(f.tables.audit_logs.length,1);
 assert.equal((await save(payload)).status,200);assert.equal(f.tables.audit_logs.length,1);
 const next=(await (await save({...payload,script:'Recovered cloud draft',expectedRevision:first.revision})).json()).draft;assert.notEqual(next.revision,first.revision);
 assert.equal((await save({...payload,title:'Stale',expectedRevision:first.revision})).status,409);
 f.actor('foreign');assert.equal((await save(payload)).status,409);assert.deepEqual((await (await r.GET()).json()).drafts,[]);f.actor(owner);
 const db=f.stubs['@/lib/supabaseAdmin'].supabaseAdmin;const plain=fixture();plain.tables.audit_logs=f.tables.audit_logs;plain.tables.voice_script_drafts=[];db.from=plain.stubs['@/lib/supabaseAdmin'].supabaseAdmin.from;
 const result=await (await r.GET()).json();assert.equal(result.storage,'voice_script_drafts');assert.equal(result.drafts[0].script,'Recovered cloud draft');
 assert.equal((await save({...payload,title:'After migration',script:next.script,expectedRevision:next.revision})).status,200);assert.equal(plain.tables.voice_script_drafts.length,0);
 assert.equal(f.load('lib/activity/map-audit').mapAuditRow(f.tables.audit_logs[0]),null);
});
test('network and permission failures do not trigger fallback writes or expose details',async()=>{
 for(const error of ['42501','NETWORK']){const {f,r,save}=setup(error);for(const response of [await r.GET(),await save(payload)]){assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private'));}assert.equal(f.tables.audit_logs.length,0);}
 const {save}=setup();assert.equal((await save({...payload,owner_id:'foreign'})).status,400);assert.equal((await save({...payload,title:''})).status,400);
});
test('recording transcription checks owner, consent, bounded audio and never changes approved assets',async()=>{
 const f=fixture();f.tables.voice_assets=[{id:id(1),owner_id:owner,storage_path:owner+'/audio.wav',approved:true},{id:id(2),owner_id:'foreign',storage_path:'foreign/audio.wav',approved:true}];
 let called=0;f.stubs['@/app/api/notes/transcribe/route']={POST:async request=>{called++;const form=await request.formData();assert.equal(form.get('consent'),'confirmed');assert.equal(form.get('audio').type,'audio/wav');return new Response(JSON.stringify({success:true,transcript:'Actual synthetic provider output.'}),{status:200});}};
 f.stubs['@/lib/supabaseAdmin'].supabaseAdmin.storage={from:()=>({download:async()=>({data:new Blob(['RIFF0000WAVEdata'],{type:'application/octet-stream'}),error:null})})};
 const route=f.load('app/api/voice-studio/transcribe/route');const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='synthetic';
 const call=body=>route.POST(new Request('http://qa/transcribe',{method:'POST',body:JSON.stringify(body)}));
 try{assert.equal((await call({voiceAssetId:id(2),consent:true})).status,404);assert.equal((await call({voiceAssetId:id(1),consent:false})).status,400);assert.equal(called,0);const r=await call({voiceAssetId:id(1),consent:true});assert.equal(r.status,200);assert.equal(called,1);assert.equal(f.tables.voice_assets[0].approved,true);assert.equal(f.calls.filter(x=>x.table==='voice_assets'&&x.mode==='update').length,0);}finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
test('reviewed transcripts save separately, reload, and cannot cross owner boundaries',async()=>{
 const f=fixture();f.tables.voice_assets=[{id:id(1),owner_id:owner,approved:true,studio_metadata:{script:'Original approved script'}},{id:id(2),owner_id:'foreign',approved:true}];
 const r=f.load('app/api/voice-studio/transcripts/route');const body={voiceAssetId:id(1),transcript:'Agent checked words.',reviewed:true};
 const post=b=>r.POST(new Request('http://qa/reviews',{method:'POST',body:JSON.stringify(b)}));
 assert.equal((await post({...body,reviewed:false})).status,400);assert.equal((await post({...body,voiceAssetId:id(2)})).status,404);
 const saved=await post(body);assert.equal(saved.status,200);assert.equal((await (await r.GET(new Request('http://qa/reviews?assetId='+id(1)))).json()).review.text,body.transcript);
 assert.equal(f.tables.voice_assets[0].studio_metadata.script,'Original approved script');assert.equal(f.tables.voice_assets[0].approved,true);
 f.actor('foreign');assert.equal((await r.GET(new Request('http://qa/reviews?assetId='+id(1)))).status,404);
});


test('campaign recording replacement needs confirmation, exact owned voicemail step, approval and compatible provider format',async()=>{
 const f=fixture();f.tables.campaigns=[{id:id(30),owner_id:owner,live_launched:false,provider:'slybroadcast',voice_asset_id:id(1)}];f.tables.campaign_steps=[{id:id(31),owner_id:owner,campaign_id:id(30),type:'voicemail',step_order:0,voice_asset_id:id(1),conditions:{voiceAssetId:id(1)}}];
 f.tables.voice_assets=[{id:id(1),owner_id:owner,approved:true,storage_path:owner+'/old.mp3'},{id:id(2),owner_id:owner,approved:true,storage_path:owner+'/new.mp3'},{id:id(3),owner_id:owner,approved:false,storage_path:owner+'/draft.mp3'},{id:id(4),owner_id:owner,approved:true,storage_path:owner+'/browser.webm'},{id:id(5),owner_id:'foreign',approved:true,storage_path:'foreign/private.mp3'}];
 const route=f.load('app/api/campaigns/[campaignId]/route'),call=body=>route.PATCH(new Request('http://qa/campaign',{method:'PATCH',body:JSON.stringify(body)}),{params:Promise.resolve({campaignId:id(30)})});
 assert.equal((await call({voiceAssetId:id(2),stepId:id(31)})).status,409);assert.equal(f.tables.campaign_steps[0].voice_asset_id,id(1));
 for(const asset of [id(3),id(4),id(5)])assert.ok((await call({voiceAssetId:asset,stepId:id(31),assignmentConfirmed:true})).status>=400);
 assert.equal((await call({voiceAssetId:id(2),stepId:id(90),assignmentConfirmed:true})).status,400);
 assert.equal((await call({voiceAssetId:id(2),stepId:id(31),assignmentConfirmed:true})).status,200);assert.equal(f.tables.campaign_steps[0].voice_asset_id,id(2));assert.equal(f.tables.voice_assets[0].storage_path,owner+'/old.mp3');assert.equal(f.tables.campaign_step_runs.length,0);
});

test('approval verifies owned stored audio and explicit review without changing other approved versions',async()=>{
 const f=fixture();f.tables.voice_assets=[{id:id(1),owner_id:owner,approved:false,storage_path:owner+'/record.wav',studio_metadata:{script:'Recorded words',source:'human'}},{id:id(2),owner_id:'foreign',approved:false,storage_path:'foreign/record.wav'},{id:id(3),owner_id:owner,approved:true,storage_path:owner+'/approved.wav',studio_metadata:{script:'Existing approved words'}}];
 const wav=Buffer.alloc(46);wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);
 let valid=true;f.stubs['@/lib/supabaseAdmin'].supabaseAdmin.storage={from:()=>({download:async()=>({data:new Blob([valid?wav:'invalid-audio']),error:null})})};
 const route=f.load('app/api/voice-assets/approve/route'),call=b=>route.POST(new Request('http://qa/approve',{method:'POST',body:JSON.stringify(b)}));
 assert.equal((await call({voiceAssetId:id(1)})).status,400);assert.equal((await call({voiceAssetId:id(2),confirmed:true})).status,404);valid=false;assert.equal((await call({voiceAssetId:id(1),confirmed:true})).status,400);valid=true;
 assert.equal((await call({voiceAssetId:id(1),confirmed:true})).status,200);assert.equal(f.tables.voice_assets[0].approved,true);assert.equal(f.tables.voice_assets[0].studio_metadata.script,'Recorded words');assert.equal(f.tables.voice_assets[2].studio_metadata.script,'Existing approved words');
 const patch=f.load('app/api/voice-assets/[id]/route');assert.equal((await patch.PATCH(new Request('http://qa/edit',{method:'PATCH',body:JSON.stringify({studioMetadata:{script:'Overwrite approved'}})}),{params:Promise.resolve({id:id(1)})})).status,409);
});
test('AI audio creates a new unapproved version linked to the actual draft and rejects unresolved personalization',async()=>{
 const f=fixture();let calls=0;f.tables.voice_assets=[{id:id(1),owner_id:owner,approved:true,script_id:id(11),studio_metadata:{script:'Previously approved words'}}];
 f.stubs['@/lib/providers/elevenlabs']={isElevenLabsConfigured:()=>true,resolveOwnerVoiceId:async()=>{calls++;return 'owned-voice';},synthesizeSpeech:async()=>new Uint8Array([73,68,51,0]).buffer};
 f.stubs['@/lib/supabaseAdmin'].supabaseAdmin.storage={from:()=>({upload:async()=>({error:null}),createSignedUrl:async()=>({data:{signedUrl:'http://qa/synthetic.mp3'},error:null})})};
 const route=f.load('app/api/voice-assets/synthesize/route'),call=script=>route.POST(new Request('http://qa/synthesize',{method:'POST',body:JSON.stringify({title:'New synthetic audio',script,scriptId:id(11)})}));
 assert.equal((await call('Hello [FirstName], I have an update.')).status,400);assert.equal(calls,0);
 const response=await call('Hello Alex, I have an update for you.');assert.equal(response.status,201);const asset=(await response.json()).voiceAsset;assert.equal(asset.script_id,id(11));assert.equal(asset.approved,false);assert.equal(asset.studio_metadata.source,'ai');assert.equal(f.tables.voice_assets[0].studio_metadata.script,'Previously approved words');assert.notEqual(asset.id,id(1));
});

test('audio upload helper follows signed upload storage before reporting an asset',async()=>{
 const f=fixture(),upload=f.load('lib/voice-studio/upload').uploadVoiceRecording,old=global.fetch;const calls=[];let fail=false;
 global.fetch=async(url,init)=>{calls.push({url:String(url),method:init?.method});if(String(url)==='/api/voice-assets/signed-upload')return new Response(JSON.stringify({success:true,voiceAsset:{id:id(99),title:'New recording',approved:false,script_id:id(11),storage_path:owner+'/new.wav'},signedUrl:'http://qa/signed-audio'}));return new Response('',{status:fail?503:200});};
 try{const saved=await upload(new Blob(['RIFF0000WAVEdata'],{type:'audio/wav'}),'New recording',id(11));assert.equal(saved.id,id(99));assert.equal(calls[1].method,'PUT');fail=true;await assert.rejects(upload(new Blob(['RIFF0000WAVEdata'],{type:'audio/wav'}),'Retry recording',id(11)));assert.ok(calls.some(c=>c.method==='DELETE'));}finally{global.fetch=old;}
});
