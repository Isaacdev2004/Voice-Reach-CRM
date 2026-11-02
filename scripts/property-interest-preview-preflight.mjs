// Status-only, Preview-specific validation. Never print credentials, provider responses or user records.
const branch="feat/property-interest-mvp";
const blocked=["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM_NUMBER","RESEND_API_KEY","RESEND_FROM_EMAIL","SLYBROADCAST_USERNAME","SLYBROADCAST_PASSWORD","SLYBROADCAST_CALLER_ID","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY","CRON_SECRET","CAMPAIGN_RUNNER_SECRET","GOOGLE_CLIENT_SECRET","GOOGLE_CLIENT_ID","ELEVENLABS_API_KEY","SHIPPO_API_TOKEN","ANTHROPIC_API_KEY","OPENAI_API_KEY","VOICE_PROVIDER_FROM_NUMBER","VOICE_WEBHOOK_SECRET"];
function requireCheck(value,label){if(!value)throw new Error(label);}
try{
 requireCheck(process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF===branch,"wrong_preview_scope");
 requireCheck(process.env.NEXT_PUBLIC_SUPABASE_URL==="https://jojgdfpmaxvbhobjrsbm.supabase.co","wrong_database");
 for(const key of blocked)requireCheck(!process.env[key],"unsafe_inherited_"+key);
 for(const key of ["ALLOW_LIVE_OUTBOUND","ASSISTANT_APPROVED_SENDS_ENABLED","MYARI_AI_BILLING_ENABLED","MYARI_AI_PUBLIC_LAUNCH_VERIFIED","MYARI_AI_ENTITLEMENTS_ENABLED","CONCIERGE_ENABLED"])
  requireCheck(process.env[key]!=="true","unsafe_flag_"+key);
 for(const key of Object.keys(process.env)){
  if(/(SEND.*(OWNER|RECIPIENT).*IDS|SENDING.*ALLOWLIST)/.test(key))requireCheck(!process.env[key],"nonempty_sending_allowlist");
 }
 const allowedCredentials=new Set(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","CLERK_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
 const unknown=Object.keys(process.env).filter(key=>!key.startsWith("VERCEL_")&&!allowedCredentials.has(key)&&
   /(?:API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|POSTGRES_URL|SERVICE_ROLE|SHIPPO.*TOKEN)/.test(key)&&process.env[key]);
 if(unknown.length)console.error("Unreviewed inherited variable names:",unknown.join(","));
 requireCheck(unknown.length===0,"unreviewed_inherited_credentials");
 const origin="https://voice-reach-crm-git-feat-pro-beed61-magnificent-soless-projects.vercel.app";
 requireCheck(process.env.APP_BASE_URL===origin&&process.env.NEXT_PUBLIC_APP_URL===origin,"wrong_app_origin");
 const pk=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY??"",sk=process.env.CLERK_SECRET_KEY??"";
 requireCheck(pk.startsWith("pk_test_"),"invalid_development_publishable_prefix");
 requireCheck(sk.startsWith("sk_test_"),"invalid_development_secret_prefix");
 requireCheck(sk.length>=24&&/^[!-~]+$/.test(sk)&&!sk.includes("..."),"truncated_or_invalid_development_secret");
 const host=Buffer.from(pk.slice(8),"base64").toString("utf8").replace(/\$$/,"");
 requireCheck(/^[a-z0-9-]+[.]clerk[.]accounts[.]dev$/.test(host),"invalid_clerk_frontend");
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY??"";
 requireCheck(Boolean(service),"missing_database_credential");
 if(!service.startsWith("sb_secret_")){
  const claims=JSON.parse(Buffer.from(service.split(".")[1]??"","base64url").toString());
  requireCheck(claims.role==="service_role"&&claims.ref==="jojgdfpmaxvbhobjrsbm","wrong_service_credential");
 }
 const fetchJson=async(url,options={})=>{const r=await fetch(url,{...options,signal:AbortSignal.timeout(12000),redirect:"error"});requireCheck(r.ok,"authentication_probe_failed");return r.json();};
 const [privateKeys,publicKeys]=await Promise.all([
  fetchJson("https://api.clerk.com/v1/jwks",{headers:{Authorization:"Bearer "+sk}}),
  fetchJson("https://"+host+"/.well-known/jwks.json")
 ]);
 requireCheck(privateKeys.keys?.some(a=>publicKeys.keys?.some(b=>a.kty===b.kty&&a.n&&a.n===b.n&&a.e===b.e)),"clerk_key_pair_mismatch");
 const r=await fetch("https://jojgdfpmaxvbhobjrsbm.supabase.co/rest/v1/contacts?select=id&limit=1",{
  headers:{apikey:service,Authorization:"Bearer "+service},signal:AbortSignal.timeout(12000),redirect:"error"
 });
 requireCheck(r.ok,"database_authentication_failed");await r.arrayBuffer();
 console.log("PROPERTY_PREVIEW_PREFLIGHT_PASS: Development Clerk pair, test Supabase, disabled providers/schedulers/billing, canonical origin");
}catch(e){console.error("PROPERTY_PREVIEW_PREFLIGHT_FAIL:",e instanceof Error&&/^[a-z_]+$/.test(e.message)?e.message:"private_probe_failed");process.exitCode=1;}
