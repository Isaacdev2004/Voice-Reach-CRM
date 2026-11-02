// Private, status-only validation. No credential values or provider bodies are logged.
const need=(ok,code)=>{if(!ok)throw new Error(code);};
const blocked=["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM_NUMBER","RESEND_API_KEY","RESEND_FROM_EMAIL","SLYBROADCAST_USERNAME","SLYBROADCAST_PASSWORD","SLYBROADCAST_CALLER_ID","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY","CRON_SECRET","CAMPAIGN_RUNNER_SECRET","GOOGLE_CLIENT_SECRET","GOOGLE_CLIENT_ID","ELEVENLABS_API_KEY","SHIPPO_API_TOKEN","ANTHROPIC_API_KEY","OPENAI_API_KEY","VOICE_PROVIDER_FROM_NUMBER","VOICE_WEBHOOK_SECRET"];
try{
 need(process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF==="feat/contacts-csv-export"&&process.env.VERCEL_PROJECT_ID==="prj_x619EYFFa4U3AV0irnzkx0jDnN1R","wrong_preview_scope");
 need(process.env.NEXT_PUBLIC_SUPABASE_URL==="https://jojgdfpmaxvbhobjrsbm.supabase.co","wrong_database");
 for(const k of blocked)need(!process.env[k],"inherited_provider_"+k);
 for(const k of ["ALLOW_LIVE_OUTBOUND","MYARI_AI_BILLING_ENABLED","MYARI_AI_PUBLIC_LAUNCH_VERIFIED","MYARI_AI_ENTITLEMENTS_ENABLED","ASSISTANT_APPROVED_SENDS_ENABLED","CONCIERGE_ENABLED","ASSISTANT_V2_ENABLED"])need(process.env[k]!=="true","unsafe_flag_"+k);
 need(!process.env.ASSISTANT_SEND_OWNER_IDS&&!process.env.ASSISTANT_SEND_RECIPIENTS,"sending_allowlist_not_empty");
 const allowed=new Set(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","CLERK_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
 const unknown=Object.keys(process.env).filter(k=>!k.startsWith("VERCEL_")&&!allowed.has(k)&&/(API_KEY|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|POSTGRES_URL|SERVICE_ROLE)/.test(k)&&process.env[k]);
 if(unknown.length)console.error("Unreviewed inherited variable names:",unknown.join(","));
 need(!unknown.length,"unreviewed_credentials");
 need(![process.env.APP_BASE_URL,process.env.NEXT_PUBLIC_APP_URL].some(v=>v&&/myari[.]io/i.test(v)),"production_app_origin");
 const pk=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY??"",sk=process.env.CLERK_SECRET_KEY??"";
 need(pk.startsWith("pk_test_")&&sk.startsWith("sk_test_")&&sk.length>=24&&/^[!-~]+$/.test(sk)&&!sk.includes("..."),"development_credentials_required");
 const host=Buffer.from(pk.slice(8),"base64").toString("utf8").replace(/\$$/,"");
 need(/^[a-z0-9-]+[.]clerk[.]accounts[.]dev$/i.test(host),"invalid_clerk_host");
 const r=await fetch("https://api.clerk.com/v1/domains",{headers:{Authorization:"Bearer "+sk},redirect:"error",signal:AbortSignal.timeout(12000)});
 need(r.ok,"clerk_authentication_failed");const domains=await r.json();
 need(Array.isArray(domains.data)&&domains.data.some(d=>{try{return new URL(d.frontend_api_url.startsWith("https://")?d.frontend_api_url:"https://"+d.frontend_api_url).hostname===host;}catch{return false;}}),"clerk_pair_mismatch");
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY??"";need(Boolean(service),"missing_service_credential");
 if(!service.startsWith("sb_secret_")){const claims=JSON.parse(Buffer.from(service.split(".")[1]??"","base64url").toString());need(claims.role==="service_role"&&claims.ref==="jojgdfpmaxvbhobjrsbm","wrong_service_credential");}
 const db=await fetch("https://jojgdfpmaxvbhobjrsbm.supabase.co/rest/v1/contacts?select=id&limit=1",{headers:{apikey:service,Authorization:"Bearer "+service},redirect:"error",signal:AbortSignal.timeout(12000)});
 need(db.ok,"database_authentication_failed");await db.arrayBuffer();
 console.log("CONTACTS_EXPORT_PREVIEW_PREFLIGHT_PASS");
}catch(e){console.error("CONTACTS_EXPORT_PREVIEW_PREFLIGHT_FAIL:",e instanceof Error&&/^[A-Za-z_]+$/.test(e.message)?e.message:"private_probe_failed");process.exitCode=1;}
