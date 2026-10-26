const test=require("node:test"), assert=require("node:assert/strict"), fs=require("node:fs"), crypto=require("node:crypto"), path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"staging-auth-acceptance.mjs"),"utf8").replace(/^import .*;\n/gm,"");
const run=new (Object.getPrototypeOf(async function(){}).constructor)("createClerkClient","createClient","randomUUID","process","fetch","console",source);
function setup(options={}) {
  const env={VERCEL_ENV:"preview",VERCEL_GIT_COMMIT_REF:"feat/ai-operating-assistant",NEXT_PUBLIC_SUPABASE_URL:"https://jojgdfpmaxvbhobjrsbm.supabase.co",CLERK_SECRET_KEY:"sk_test_synthetic",NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:"pk_test_synthetic",SUPABASE_SERVICE_ROLE_KEY:"synthetic",STAGING_ACCEPTANCE_TARGET:"https://voice-reach-a0a767euw-magnificent-soless-projects.vercel.app",...Object.fromEntries(["ALLOW_LIVE_OUTBOUND","ASSISTANT_V2_ENABLED","ASSISTANT_APPROVED_SENDS_ENABLED","MYARI_AI_BILLING_ENABLED"].map(k=>[k,"false"])),...options.env};
  const rows=[],revoked=[],output=[],process={env}; let created=0;
  const clerk={ users:{getUserList:async()=>({data:[]}),createUser:async p=>{assert.equal(p.emailAddress,undefined);assert.equal(p.phoneNumber,undefined);return{id:`user_${created++}`,privateMetadata:p.privateMetadata};}}, sessions:{createSession:async p=>({id:p.userId}),getToken:async id=>({jwt:id}),revokeSession:async id=>revoked.push(id)},authenticateRequest:async r=>({toAuth:()=>({userId:r.headers.get("authorization").slice(7)})}) };
  const db={from:()=>({insert:async r=>{rows.push(r);return{};},delete:()=>{const filters={};const q={eq(k,v){filters[k]=v;return q;},then(resolve){for(let i=rows.length-1;i>=0;i--)if(Object.entries(filters).every(([k,v])=>rows[i][k]===v))rows.splice(i,1);return Promise.resolve(resolve({}));}};return q;}})};
  const fetch=async(url,init)=>{
    if(options.protected)return new Response("protected",{status:401,headers:{"content-type":"text/html"}});
    const pathname=new URL(url).pathname;
    if(pathname==="/api/assistant/config")return Response.json({success:true,enabled:false,externalActionsEnabled:false,safetyLimits:{dailyInteractions:5,dailyProviderCalls:10}});
    const row=rows.find(r=>r.id===pathname.split("/").pop()&&`Bearer ${r.owner_id}`===init.headers.Authorization);
    return Response.json(row?{success:true,contact:row}:{success:false},{status:row?200:404});
  };
  return{rows,revoked,output,process,get created(){return created;},execute:()=>run(()=>clerk,()=>db,crypto.randomUUID,process,fetch,{log:(_,json)=>output.push(JSON.parse(json))})};
}
test("private acceptance refuses Production before creating any accounts",async()=>{const f=setup({env:{VERCEL_ENV:"production"}});await f.execute();assert.equal(f.created,0);assert.equal(f.output[0].failedPhase,"safety");});
test("two synthetic owners pass own-record access, foreign denial and cleanup without enabling Assistant",async()=>{const f=setup();await f.execute();assert.equal(f.output[0].success,true);assert.equal(f.output[0].sessionsValidated,2);assert.equal(f.output[0].tenantIsolation,true);assert.equal(f.output[0].assistantRemainsDisabled,true);assert.equal(f.rows.length,0);assert.equal(f.revoked.length,2);assert.ok(!JSON.stringify(f.output).includes("user_"));});
test("protected-preview failure cleans sessions and never inserts CRM fixtures",async()=>{const f=setup({protected:true});await f.execute();assert.equal(f.output[0].failedPhase,"preview_access");assert.equal(f.output[0].protectedPreviewStatus,401);assert.equal(f.rows.length,0);assert.equal(f.revoked.length,2);});
