-- REVIEW ONLY. Not applied. Transactional; no provider calls, no row deletion/backfill.
-- Run only on the separately approved project after recovery evidence is verified.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
-- Fail closed on missing/wrong baseline instead of creating an unrelated schema.
do $$ begin
  if to_regclass('public.integration_connections') is null or to_regclass('public.audit_logs') is null then
    raise exception 'Expected integration/audit schema absent';
  end if;
  if exists(select 1 from public.integration_connections where provider <> 'dotloop') then
    raise exception 'Unexpected provider: review consumers before migration';
  end if;
end $$;
alter table public.integration_connections enable row level security;
drop policy if exists "server owned integration_connections" on public.integration_connections;
revoke all on public.integration_connections from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.integration_connections to service_role;
-- No client policies: server-owned table. service_role bypasses RLS; every server operation MUST scope owner/provider.
alter table public.integration_connections
  alter column access_token drop not null,
  add column access_token_ciphertext text,
  add column refresh_token_ciphertext text,
  add column credential_version bigint not null default 0,
  add column connection_state text not null default 'reconnect_required'
    check (connection_state in ('active','reconnect_required','disconnecting','revocation_pending')),
  add column operation_lease uuid,
  add column operation_kind text check(operation_kind in ('refresh','revoke')),
  add column operation_until timestamptz,
  add constraint dotloop_encrypted_credentials check (
    access_token_ciphertext is null or (access_token is null and refresh_token is null
      and access_token_ciphertext like 'v1:%' and (refresh_token_ciphertext is null or refresh_token_ciphertext like 'v1:%')));

create function public.store_dotloop_connection(p_owner text,p_access text,p_refresh text,p_expires timestamptz,p_label text,p_scopes text[])
returns void language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if coalesce(length(p_owner),0)=0 or p_access is null or p_access not like 'v1:%' or p_expires is null or p_expires<=now() then
    raise exception 'Invalid encrypted authorization';
  end if;
  insert into public.integration_connections(owner_id,provider,access_token,refresh_token,access_token_ciphertext,refresh_token_ciphertext,expires_at,account_label,scopes,connection_state,credential_version)
  values(p_owner,'dotloop',null,null,p_access,p_refresh,p_expires,p_label,p_scopes,'active',1)
  on conflict(owner_id,provider) do update set access_token=null,refresh_token=null,
    access_token_ciphertext=excluded.access_token_ciphertext,refresh_token_ciphertext=excluded.refresh_token_ciphertext,
    expires_at=excluded.expires_at,account_label=excluded.account_label,scopes=excluded.scopes,
    connection_state='active',credential_version=integration_connections.credential_version+1,
    operation_lease=null,operation_kind=null,operation_until=null,updated_at=clock_timestamp()
    where integration_connections.operation_lease is null or integration_connections.operation_until<now();
  if not found then raise exception 'Authorization operation in progress'; end if;
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata)
    values(p_owner,'DOTLOOP_AUTHORIZATION_STORED','integration',null,'{}');
end $$;

create function public.claim_dotloop_operation(p_owner text,p_lease uuid,p_operation text)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.integration_connections;
begin
  if p_operation not in ('refresh','revoke') or p_lease is null then raise exception 'Invalid operation'; end if;
  -- An abandoned refresh cannot be safely retried: its provider outcome is unknown.
  if p_operation='refresh' then
    update public.integration_connections set connection_state='reconnect_required',updated_at=clock_timestamp()
      where owner_id=p_owner and provider='dotloop' and operation_kind='refresh' and operation_until<now();
  end if;
  update public.integration_connections set operation_lease=p_lease,operation_kind=p_operation,operation_until=now()+interval '90 seconds',
    connection_state=case when p_operation='revoke' then 'disconnecting' else connection_state end,updated_at=clock_timestamp()
    where owner_id=p_owner and provider='dotloop'
      and ((operation_lease is null) or (p_operation='revoke' and operation_until<now()))
      and (p_operation='revoke' or (connection_state='active' and refresh_token_ciphertext is not null
        and (expires_at is null or expires_at<=now()+interval '60 seconds')))
    returning * into r;
  if not found then return null; end if;
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata)
    values(p_owner,case when p_operation='revoke' then 'DOTLOOP_DISCONNECT_REQUESTED' else 'DOTLOOP_REFRESH_STARTED' end,'integration',r.id,'{}');
  -- Never return legacy plaintext, even to normal server services.
  return jsonb_build_object('owner_id',r.owner_id,'provider',r.provider,'credential_version',r.credential_version,
    'access_token_ciphertext',r.access_token_ciphertext,'refresh_token_ciphertext',r.refresh_token_ciphertext,
    'expires_at',r.expires_at,'connection_state',r.connection_state);
end $$;

create function public.finish_dotloop_operation(p_owner text,p_lease uuid,p_version bigint,p_operation text,p_state text,
  p_access text,p_refresh text,p_expires timestamptz,p_scopes text[])
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
declare r public.integration_connections;
begin
  if not ((p_operation='refresh' and p_state in ('active','reconnect_required')) or
    (p_operation='revoke' and p_state in ('revoked','revocation_pending'))) then raise exception 'Invalid outcome'; end if;
  select * into r from public.integration_connections where owner_id=p_owner and provider='dotloop'
    and operation_lease=p_lease and operation_kind=p_operation and credential_version=p_version for update;
  if not found then return false; end if;
  if p_state='revoked' then
    delete from public.integration_connections where id=r.id and owner_id=p_owner and provider='dotloop';
  else
    if p_state='active' and (p_access is null or p_access not like 'v1:%' or p_expires is null or p_expires<=now()) then
      raise exception 'Invalid encrypted authorization';
    end if;
    update public.integration_connections set connection_state=p_state,
      access_token_ciphertext=case when p_state='active' then p_access else access_token_ciphertext end,
      refresh_token_ciphertext=case when p_state='active' then p_refresh else refresh_token_ciphertext end,
      expires_at=case when p_state='active' then p_expires else expires_at end,
      scopes=case when p_state='active' then p_scopes else scopes end,
      credential_version=credential_version+1,operation_lease=null,operation_kind=null,operation_until=null,updated_at=clock_timestamp()
      where id=r.id and owner_id=p_owner and provider='dotloop';
  end if;
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,
    case p_state when 'active' then 'DOTLOOP_TOKEN_REFRESHED' when 'revoked' then 'DOTLOOP_DISCONNECTED'
      when 'revocation_pending' then 'DOTLOOP_REVOCATION_PENDING' else 'DOTLOOP_RECONNECT_REQUIRED' end,'integration',r.id,'{}');
  return true;
end $$;
-- Explicit operator backfill only; normal routes never read plaintext or call this RPC.
create function public.migrate_dotloop_credential(p_owner text,p_version bigint,p_access text,p_refresh text)
returns boolean language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
  if p_access is null or p_access not like 'v1:%' then raise exception 'Encrypted value required'; end if;
  update public.integration_connections set access_token_ciphertext=p_access,refresh_token_ciphertext=p_refresh,
    access_token=null,refresh_token=null,credential_version=credential_version+1,updated_at=clock_timestamp()
    where owner_id=p_owner and provider='dotloop' and credential_version=p_version
      and connection_state='reconnect_required' and access_token_ciphertext is null and operation_lease is null;
  if not found then return false; end if;
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata)
    values(p_owner,'DOTLOOP_LEGACY_CREDENTIAL_ENCRYPTED','integration',null,'{}');
  return true;
end $$;
revoke all on function public.migrate_dotloop_credential(text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.migrate_dotloop_credential(text,bigint,text,text) to service_role;
revoke all on function public.store_dotloop_connection(text,text,text,timestamptz,text,text[]),
  public.claim_dotloop_operation(text,uuid,text),public.finish_dotloop_operation(text,uuid,bigint,text,text,text,text,timestamptz,text[])
  from public,anon,authenticated;
grant execute on function public.store_dotloop_connection(text,text,text,timestamptz,text,text[]),
  public.claim_dotloop_operation(text,uuid,text),public.finish_dotloop_operation(text,uuid,bigint,text,text,text,text,timestamptz,text[])
  to service_role;
commit;
