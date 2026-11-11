const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require(process.env.MYARI_PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.audit_logs(id uuid default gen_random_uuid(),owner_id text,action text,entity_type text,entity_id text,metadata jsonb);
 grant insert on public.audit_logs to service_role;
 create table public.calendar_connections(id uuid primary key,owner_id text,access_token text);
 insert into public.calendar_connections values(gen_random_uuid(),'calendar-owner','synthetic-calendar-ciphertext');`);
 // Reproduce the audited vulnerable baseline, then apply the exact proposed SQL.
 const baseline=fs.readFileSync('supabase/schema-integrations.sql','utf8');await db.exec(baseline);
 await db.exec(`create policy "server owned integration_connections" on public.integration_connections for all using(true) with check(true);
 grant all on public.integration_connections to anon,authenticated;
 insert into public.integration_connections(owner_id,provider,access_token,refresh_token) values('legacy','dotloop','synthetic-access','synthetic-refresh');`);
 await db.exec(fs.readFileSync('docs/dotloop-security/production.sql','utf8'));
 for(const role of ['anon','authenticated']){
  for(const query of ["select * from public.integration_connections","update public.integration_connections set owner_id='attacker'","delete from public.integration_connections","truncate public.integration_connections","insert into public.integration_connections(owner_id,provider) values('attacker','dotloop')","select public.claim_dotloop_operation('legacy',gen_random_uuid(),'refresh')","select public.migrate_dotloop_credential('legacy',0,'v1:test:a:b:c',null)"]){
   await db.exec(`set role ${role}`);await assert.rejects(db.exec(query),/permission denied/);await db.exec('reset role');
  }
 }
 const preserved=await db.query("select count(*)::int n from public.integration_connections where owner_id='legacy' and access_token='synthetic-access' and refresh_token='synthetic-refresh' and connection_state='reconnect_required'");assert.equal(preserved.rows[0].n,1);
 await db.exec('set role service_role');
 const migrated=await db.query("select public.migrate_dotloop_credential('legacy',0,'v1:test:iv:tag:old','v1:test:iv:tag:refresh') ok");assert.equal(migrated.rows[0].ok,true);
 const legacy=await db.query("select access_token,refresh_token,connection_state from public.integration_connections where owner_id='legacy'");assert.equal(legacy.rows[0].access_token,null);assert.equal(legacy.rows[0].refresh_token,null);assert.equal(legacy.rows[0].connection_state,'reconnect_required');
 const store=(owner)=>db.query("select public.store_dotloop_connection($1,'v1:test:iv:tag:access','v1:test:iv:tag:refresh',now()+interval '1 hour','Synthetic',array['account:read'])",[owner]);
 await store('a');await store('b');
 // Expire only synthetic A, then exercise the database's actual concurrency/fencing rules.
 await db.exec("update public.integration_connections set expires_at=now()-interval '1 minute' where owner_id='a' and provider='dotloop'");
 const lease='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 const claim=(o,l,k)=>db.query('select public.claim_dotloop_operation($1,$2,$3) r',[o,l,k]);
 const first=(await claim('a',lease,'refresh')).rows[0].r;assert.ok(first);assert.ok(!Object.hasOwn(first,'access_token'));
 assert.equal((await claim('a',other,'refresh')).rows[0].r,null);
 await assert.rejects(store('a'),/operation in progress/);
 const finish=(o,l,v,k,s)=>db.query('select public.finish_dotloop_operation($1,$2,$3,$4,$5,$6,$7,now()+interval \'1 hour\',array[\'account:read\']) ok',[o,l,v,k,s,'v1:test:iv:tag:new','v1:test:iv:tag:refresh']);
 assert.equal((await finish('b',lease,first.credential_version,'refresh','active')).rows[0].ok,false);
 assert.equal((await finish('a',other,first.credential_version,'refresh','active')).rows[0].ok,false);
 assert.equal((await finish('a',lease,first.credential_version,'refresh','active')).rows[0].ok,true);
 assert.equal((await finish('a',lease,first.credential_version,'refresh','active')).rows[0].ok,false);
 const revoke=(await claim('a',other,'revoke')).rows[0].r;assert.ok(revoke);
 assert.equal((await finish('a',other,revoke.credential_version,'revoke','revocation_pending')).rows[0].ok,true);
 const retry=(await claim('a',lease,'revoke')).rows[0].r;assert.ok(retry);
 assert.equal((await finish('a',lease,retry.credential_version,'revoke','revoked')).rows[0].ok,true);
 const b=await db.query("select count(*)::int n from public.integration_connections where owner_id='b'");assert.equal(b.rows[0].n,1);
 await db.exec('reset role');
 const calendar=await db.query('select access_token from public.calendar_connections');assert.equal(calendar.rows[0].access_token,'synthetic-calendar-ciphertext');
 const audit=await db.query("select count(*)::int n from public.audit_logs where action='DOTLOOP_DISCONNECTED' and owner_id='a'");assert.equal(audit.rows[0].n,1);
 console.log('PASS exact SQL in disposable PGlite/Postgres: client grants denied, legacy/calendar preserved, encrypted save, lease fencing/replay, revoke retry, atomic audit');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
