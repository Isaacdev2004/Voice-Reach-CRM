import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { encryptDotloopToken, decryptDotloopToken, dotloopEncryptionReady } from '../lib/integrations/dotloop-crypto';
import { createDotloopLifecycle, dotloopStatus, type DotloopDependencies, type DotloopRecord } from '../lib/integrations/dotloop-lifecycle';

// Synthetic process-local keys only; never load .env or reach providers.
process.env.DOTLOOP_TOKEN_KEYRING=JSON.stringify({test:randomBytes(32).toString('base64'),old:randomBytes(32).toString('base64')});
process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID='test';
test('AEAD randomized, owner/provider-purpose bound, rejects tampering/plaintext and supports retained old keys',()=>{
  const c=encryptDotloopToken('a','access','synthetic-token');
  assert.notEqual(c,encryptDotloopToken('a','access','synthetic-token'));
  assert.equal(decryptDotloopToken('a','access',c),'synthetic-token');
  assert.throws(()=>decryptDotloopToken('b','access',c)); assert.throws(()=>decryptDotloopToken('a','refresh',c));
  const parts=c.split(':');parts[3]=Buffer.alloc(16).toString('base64url');assert.throws(()=>decryptDotloopToken('a','access',parts.join(':')));
  assert.throws(()=>decryptDotloopToken('a','access','plaintext'));
  process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID='old';const old=encryptDotloopToken('a','access','old');
  process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID='test';assert.equal(decryptDotloopToken('a','access',old),'old');
  process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID='missing';assert.equal(dotloopEncryptionReady(),false);assert.throws(()=>encryptDotloopToken('a','access','x'));
  process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID='test';
});
function fixture(){
  let row:DotloopRecord|null={owner_id:'a',provider:'dotloop',account_label:'Synthetic',expires_at:new Date(0).toISOString(),updated_at:'2026-01-01',credential_version:1,connection_state:'active',access_token_ciphertext:encryptDotloopToken('a','access','old'),refresh_token_ciphertext:encryptDotloopToken('a','refresh','refresh')};
  let held:string|null=null;let calls=0;let revokeFail=false;let refreshFail=false;let stale=false;
  const d:DotloopDependencies={encrypt:encryptDotloopToken,decrypt:decryptDotloopToken,uuid:()=>crypto.randomUUID(),now:()=>Date.now(),
    read:async owner=>row?.owner_id===owner?{...row}:null,
    claim:async(owner,lease,op)=>{if(!row||row.owner_id!==owner||held)return null;held=lease;if(op==='revoke')row.connection_state='disconnecting';return {...row};},
    finish:async(owner,lease,version,op,state,t)=>{if(!row||row.owner_id!==owner||held!==lease||version!==row.credential_version||stale)return false;
      if(state==='revoked')row=null;else {row.connection_state=state as DotloopRecord['connection_state'];row.credential_version++;if(t){row.access_token_ciphertext=t.access;row.refresh_token_ciphertext=t.refresh;row.expires_at=t.expiresAt;}}held=null;return true;},
    refresh:async()=>{calls++;await new Promise(r=>setTimeout(r,10));if(refreshFail)throw Error('synthetic private provider body');return {access_token:'new',expires_in:3600,scope:['loop:read']};},
    revoke:async()=>{if(revokeFail)throw Error('synthetic provider unavailable');},
  };
  return {service:createDotloopLifecycle(d),row:()=>row,calls:()=>calls,failRevoke:()=>{revokeFail=true;},failRefresh:()=>{refreshFail=true;},stale:()=>{stale=true;}};
}
test('two concurrent instances: one refresh; refresh token retained when provider omits replacement',async()=>{
 const f=fixture();const results=await Promise.allSettled([f.service.accessToken('a'),f.service.accessToken('a')]);
 assert.equal(f.calls(),1);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.row()?.connection_state,'active');
 assert.equal(decryptDotloopToken('a','refresh',f.row()!.refresh_token_ciphertext!),'refresh');
 assert.equal(await f.service.accessToken('a'),'new');assert.equal(f.calls(),1);
});
test('foreign owner cannot read, refresh, or revoke',async()=>{const f=fixture();await assert.rejects(f.service.accessToken('b'));assert.deepEqual(await f.service.disconnect('b'),{revoked:true,pending:false});assert.ok(f.row());assert.equal(f.calls(),0);});
test('uncertain refresh requires reconnect; no automatic provider replay',async()=>{const f=fixture();f.failRefresh();await assert.rejects(f.service.accessToken('a'),/reconnect_required/);await assert.rejects(f.service.accessToken('a'));assert.equal(f.calls(),1);assert.equal(f.row()?.connection_state,'reconnect_required');});
test('stale refresh completion cannot return its token',async()=>{const f=fixture();f.stale();await assert.rejects(f.service.accessToken('a'));});
test('failed revocation disables local access and retains encrypted credentials for retry',async()=>{const f=fixture();f.failRevoke();assert.deepEqual(await f.service.disconnect('a'),{revoked:false,pending:true});assert.equal(f.row()?.connection_state,'revocation_pending');await assert.rejects(f.service.accessToken('a'));});
test('successful revocation removes only that owner connection, idempotent repeated disconnect',async()=>{const f=fixture();assert.deepEqual(await f.service.disconnect('a'),{revoked:true,pending:false});assert.equal(f.row(),null);await f.service.disconnect('a');});
test('expired, legacy, unavailable and revoked credentials never report connected',()=>{const f=fixture();const row=f.row()!;assert.equal(dotloopStatus(row,true).state,'refresh_required');assert.equal(dotloopStatus(row,true).connected,false);assert.equal(dotloopStatus({...row,access_token_ciphertext:null},true).state,'reconnect_required');assert.equal(dotloopStatus(row,false).state,'configuration_required');assert.equal(dotloopStatus({...row,connection_state:'revocation_pending'},true).connected,false);});
