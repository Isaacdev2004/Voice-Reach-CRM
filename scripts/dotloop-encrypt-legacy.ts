/** Operator-only, never imported by the application. Default: count-only, no secrets read. */
import { createClient } from '@supabase/supabase-js';
import { encryptDotloopToken, decryptDotloopToken } from '../lib/integrations/dotloop-crypto';
async function main() {
  const apply=process.argv.includes('--apply'),target=process.argv.find(a=>a.startsWith('--project='))?.slice(10);
  const host=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??'').hostname;
  if(!target||host!==`${target}.supabase.co`)throw Error('Explicit project must match configured Supabase host');
  if(apply && target!=='jojgdfpmaxvbhobjrsbm' && !process.argv.includes(`--approved-production-encryption=${target}`))
    throw Error('Separate Production credential migration approval required');
  const db=createClient(`https://${host}`,process.env.SUPABASE_SERVICE_ROLE_KEY??'',{auth:{persistSession:false,autoRefreshToken:false}});
  const {count,error}=await db.from('integration_connections').select('id',{count:'exact',head:true}).eq('provider','dotloop').is('access_token_ciphertext',null);
  if(error)throw Error('Metadata check failed');
  console.log(JSON.stringify({mode:apply?'explicit-encryption':'count-only',legacyCount:count}));
  if(!apply)return;
  let encrypted=0;
  while(true){
    const {data,error}=await db.from('integration_connections').select('owner_id,credential_version,access_token,refresh_token').eq('provider','dotloop')
      .eq('connection_state','reconnect_required').is('access_token_ciphertext',null).not('access_token','is',null).limit(25);
    if(error)throw Error('Backfill read failed');if(!data?.length)break;
    for(const r of data){
      const access=encryptDotloopToken(r.owner_id,'access',r.access_token);
      const refresh=r.refresh_token?encryptDotloopToken(r.owner_id,'refresh',r.refresh_token):null;
      if(decryptDotloopToken(r.owner_id,'access',access)!==r.access_token ||
        (refresh&&decryptDotloopToken(r.owner_id,'refresh',refresh)!==r.refresh_token))throw Error('Round-trip failed');
      const result=await db.rpc('migrate_dotloop_credential',{p_owner:r.owner_id,p_version:r.credential_version,p_access:access,p_refresh:refresh});
      if(result.error||result.data!==true)throw Error('Backfill conflict; stop and review');
      encrypted++;
    }
  }
  console.log(JSON.stringify({encrypted,activated:false,providerCalls:0}));
}
main().catch(()=>{console.error('Credential migration stopped. Review privately; no credentials logged.');process.exitCode=1;});
