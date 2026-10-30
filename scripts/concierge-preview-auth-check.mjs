// Private build-only read checks. Never prints credentials or provider response bodies.
const env = process.env;
const value = key => env[key]?.trim() ?? "";
const fail = (code, detail = {}) => { console.log("MYARI_PREVIEW_AUTH", JSON.stringify({success:false,code,...detail})); process.exit(1); };
const expected = process.argv.find(x=>x.startsWith("--commit="))?.slice(9);
if (!expected || value("VERCEL_ENV") !== "preview" || value("VERCEL_PROJECT_ID") !== "prj_x619EYFFa4U3AV0irnzkx0jDnN1R" || value("VERCEL_GIT_COMMIT_REF") !== "feat/concierge-pilot-readiness" || value("VERCEL_GIT_COMMIT_SHA") !== expected) fail("deployment_identity_mismatch");
const off = ["ALLOW_LIVE_OUTBOUND","ASSISTANT_V2_ENABLED","CONCIERGE_ENABLED","CONCIERGE_RETENTION_ENABLED","ASSISTANT_APPROVED_SENDS_ENABLED","MYARI_AI_BILLING_ENABLED","MYARI_AI_PUBLIC_LAUNCH_VERIFIED","MYARI_AI_ENTITLEMENTS_ENABLED","MYARI_AI_PRICING_ENABLED","MYARI_AI_PLAN_CHANGES_ENABLED"];
if (off.some(k=>value(k)!=="false")) fail("isolation_flags_mismatch");
const empty=["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","TWILIO_AUTH_TOKEN","TWILIO_ACCOUNT_SID","RESEND_API_KEY","SLYBROADCAST_PASSWORD","ELEVENLABS_API_KEY","ANTHROPIC_API_KEY","GOOGLE_CLIENT_SECRET","CAMPAIGN_RUNNER_SECRET","CRON_SECRET","DATABASE_URL","DIRECT_URL","POSTGRES_URL","SUPABASE_DB_URL","ASSISTANT_SEND_OWNER_IDS","ASSISTANT_SEND_RECIPIENTS","CONCIERGE_OWNER_IDS","CONCIERGE_MANAGER_IDS","CONCIERGE_ADMIN_IDS","CONCIERGE_SPECIALIST_IDS","CONCIERGE_SALES_IDS"];
if (empty.some(k=>value(k))) fail("unsafe_inherited_configuration");
if (value("NEXT_PUBLIC_SUPABASE_URL")!=="https://jojgdfpmaxvbhobjrsbm.supabase.co") fail("test_database_mismatch");
const pk=value("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),sk=value("CLERK_SECRET_KEY");
if (!pk.startsWith("pk_test_") || !sk.startsWith("sk_test_")) fail("clerk_development_required");
if (/[^\x21-\x7e]/.test(sk)) fail("clerk_secret_invalid_characters");
const host=Buffer.from(pk.slice(8),"base64").toString("utf8").replace(/\$$/,"");
if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/i.test(host)) fail("clerk_host_invalid");
let phase="clerk_backend";
try {
 const domains=await fetch("https://api.clerk.com/v1/domains",{headers:{Authorization:`Bearer ${sk}`},redirect:"error",signal:AbortSignal.timeout(12000)});
 if (!domains.ok) fail("clerk_backend_authentication_rejected");
 const data=await domains.json();
 if (!Array.isArray(data.data) || !data.data.some(d=>{try{return new URL(d.frontend_api_url.startsWith("https://")?d.frontend_api_url:`https://${d.frontend_api_url}`).hostname===host}catch{return false}})) fail("clerk_key_pair_mismatch");
 phase="clerk_frontend";
 const frontend=await fetch(`https://${host}/v1/environment`,{redirect:"error",signal:AbortSignal.timeout(12000)});
 if (!frontend.ok) fail("clerk_frontend_unreachable");
 phase="clerk_browser_script";
 const script=await fetchBrowserScript(`https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,host);
 if (!script.ok) fail("clerk_browser_script_unreachable");
 console.log("MYARI_PREVIEW_AUTH",JSON.stringify({success:true,clerkDevelopmentPair:"PASS",frontendEnvironment:"PASS",browserScript:"PASS",sendingAndBilling:"DISABLED",scope:"read_only_prebuild_not_browser_authentication"}));
} catch (error) {
 const allowed=["ENOTFOUND","EAI_AGAIN","ECONNRESET","ETIMEDOUT","ERR_TLS_CERT_ALTNAME_INVALID","UNABLE_TO_VERIFY_LEAF_SIGNATURE","UND_ERR_CONNECT_TIMEOUT","ERR_INVALID_CHAR"];
 const raw=error?.cause?.code ?? error?.code;
 fail("private_auth_check_unavailable",{phase,category:allowed.includes(raw)?raw:error?.name==="TimeoutError"?"TIMEOUT":"NETWORK_OR_INVALID_RESPONSE"});
}

async function fetchBrowserScript(start, host, fetcher = fetch) {
 let url = new URL(start);
 for (let hop=0; hop<4; hop++) {
  if (url.protocol !== "https:" || ![host,"cdn.jsdelivr.net","cdn.clerk.com","unpkg.com"].includes(url.hostname)) throw new Error("untrusted_script_redirect");
  const response = await fetcher(url.href,{redirect:"manual",signal:AbortSignal.timeout(12000)});
  if (![301,302,303,307,308].includes(response.status)) return response;
  const location = response.headers.get("location");
  if (!location) throw new Error("missing_script_redirect");
  url = new URL(location,url);
 }
 throw new Error("script_redirect_limit");
}
