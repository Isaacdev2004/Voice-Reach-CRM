const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
let actor='owner-a',calls=[];
class DotloopError extends Error {constructor(code,status=503){super(code);this.code=code;this.status=status;}}
const json=(x,init)=>Response.json(x,{status:init?.status??200});
const stubs={
 '@/lib/api-response':{apiOk:json,apiError:(error,init)=>json({error,code:init?.code},init)},
 '@/lib/auth':{requireUserId:async()=>{if(!actor)throw Error('Unauthorized');return actor;}},
 '@/lib/integrations/dotloop-lifecycle':{DotloopError},
 '@/lib/integrations/dotloop':{
 getDotloopStatus:async owner=>{calls.push(['status',owner]);return {connected:false,state:'refresh_required'};},
 getValidDotloopAccessToken:async owner=>{calls.push(['access',owner]);return 'synthetic';},
 fetchDotloopAccountLabel:async()=>{calls.push(['verify']);return 'Synthetic';},
 disconnectDotloop:async owner=>{calls.push(['disconnect',owner]);return {pending:true,revoked:false};},
 },
};
const source=fs.readFileSync(path.join(__dirname,'../app/api/integrations/dotloop/status/route.ts'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const m={exports:{}};new Function('require','module','exports',code)(id=>stubs[id]??require(id),m,m.exports);
const request=(method,origin)=>new Request('https://preview.example/api/integrations/dotloop/status',{method,headers:origin?{origin}: {}});
(async()=>{
 actor=null;assert.equal((await m.exports.GET()).status,401);assert.equal((await m.exports.DELETE(request('DELETE','https://preview.example'))).status,401);assert.deepEqual(calls,[]);
 actor='owner-a';assert.equal((await m.exports.POST(request('POST','https://evil.example'))).status,403);assert.equal((await m.exports.DELETE(request('DELETE'))).status,403);assert.deepEqual(calls,[]);
 assert.equal((await m.exports.GET()).status,200);assert.deepEqual(calls,[['status','owner-a']]);calls=[];
 const req=request('POST','https://preview.example');req.headers.set('x-owner-id','owner-b');assert.equal((await m.exports.POST(req)).status,200);assert.equal(calls[0][1],'owner-a');calls=[];
 const res=await m.exports.DELETE(request('DELETE','https://preview.example'));assert.equal(res.status,202);assert.equal((await res.json()).state,'revocation_pending');assert.deepEqual(calls,[['disconnect','owner-a']]);
 const google=fs.readFileSync(path.join(__dirname,'../lib/calendar/google.ts'),'utf8');assert.ok(google.includes('calendar_connections'));assert.ok(!google.includes('integration_connections'));
 const sql=fs.readFileSync(path.join(__dirname,'../docs/dotloop-security/production.sql'),'utf8');assert.ok(!sql.includes('calendar_connections'));assert.ok(!sql.includes('security definer'));assert.ok(!sql.includes('using (true)'));
 console.log('PASS route authentication, origin checks, owner spoof denial, read-only GET, pending-revocation truthfulness, Google separation');
})().catch(e=>{console.error(e);process.exitCode=1;});
