// Read-only private operator check. Run only in an authorized host with existing Live Clerk binding.
// Does not load/export keys, query CRM data, modify identities, or create sessions.
import { pathToFileURL } from 'node:url';
export const target='user_3LbCsPoH76YvWJhXwzhHPzltnoR';
export async function verifyLiveContactOwner(env=process.env,request=fetch){
 if(!env.CLERK_SECRET_KEY?.startsWith('sk_live_')||!env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_'))return {result:'BLOCKED',reason:'authorized_live_clerk_binding_required',requests:0};
 const headers={Authorization:`Bearer ${env.CLERK_SECRET_KEY}`};
 const get=async path=>{const response=await request(`https://api.clerk.com/v1${path}`,{method:'GET',headers,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`clerk_http_${response.status}`);return response.json();};
 try{
  const user=await get(`/users/${target}`);
  if(user.id!==target)return {result:'FAIL',reason:'identity_mismatch'};
  const primary=user.email_addresses?.find(row=>row.id===user.primary_email_address_id);
  const memberships=[];
  for(let offset=0;;offset+=100){
   const page=await get(`/users/${target}/organization_memberships?limit=100&offset=${offset}`);
   if(!Array.isArray(page.data))throw Error('clerk_membership_response_invalid');
   memberships.push(...page.data.map(row=>row.organization?.id).filter(Boolean));
   if(page.data.length<100)break;
   if(offset>=9900)throw Error('membership_review_required');
  }
  const organizations=[...new Set(memberships)];
  const primaryEmailMatches=primary?.email_address?.toLowerCase()==='hello@myari.io';
  const emailVerified=primary?.verification?.status==='verified';
  const accountActive=!user.banned&&!user.locked;
  return {result:primaryEmailMatches&&emailVerified&&accountActive&&organizations.length<=1?'PASS':'BLOCKED',clerkMode:'live',clerkUserId:target,primaryEmailMatches,emailVerified,accountActive,organizationIds:organizations,organizationCount:organizations.length,multipleWorkspacesRequireConfirmation:organizations.length>1,crmOwnerNamespace:target,activationPerformed:false};
 }catch(error){return {result:'BLOCKED',reason:error instanceof Error&&/^clerk_http_\d+$/.test(error.message)?error.message:'private_identity_check_unavailable'};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await verifyLiveContactOwner();console.log(JSON.stringify(result));if(result.result!=='PASS')process.exitCode=1;}
