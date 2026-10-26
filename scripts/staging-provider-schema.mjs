import assert from "node:assert/strict";
assert.equal(process.env.VERCEL_ENV,"preview");
assert.equal(process.env.VERCEL_GIT_COMMIT_REF,"feat/ai-operating-assistant");
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL,"https://jojgdfpmaxvbhobjrsbm.supabase.co");
assert.equal(process.env.ALLOW_LIVE_OUTBOUND,"false");
const {openaiProvider}=await import("../lib/assistant/provider.ts");
const {enabledToolDefinitions}=await import("../lib/assistant/tools.ts");
const original=globalThis.fetch;
globalThis.fetch=async(...args)=>{
  const response=await original(...args);
  if(!response.ok && String(args[0])==="https://api.openai.com/v1/responses"){
    const data=await response.clone().json().catch(()=>null);
    // Only schema diagnostics: never print authentication errors or credentials.
    if(data?.error?.code==="invalid_function_parameters")console.log("MYARI_SCHEMA_ERROR",String(data.error.message).slice(0,1200));
  }
  return response;
};
try{
  const r=await openaiProvider.respond({system:"Synthetic integration check. Reply OK without calling tools.",messages:[{role:"user",content:"Reply OK."}],tools:enabledToolDefinitions()});
  console.log("MYARI_SCHEMA_OK",JSON.stringify({inputTokens:r.usage.inputTokens,outputTokens:r.usage.outputTokens}));
}catch{process.exitCode=1;}finally{globalThis.fetch=original;}
