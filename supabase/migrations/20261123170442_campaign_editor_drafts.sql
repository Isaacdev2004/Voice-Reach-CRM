-- REVIEW ONLY: apply to isolated staging first. No production execution authorized.
begin;
create table public.campaign_editor_drafts (
  campaign_id uuid primary key references public.campaigns(id),
  owner_id text not null,
  revision integer not null check(revision>0),
  snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
  state text not null default 'draft' check(state in ('draft','activating','activated','blocked')),
  activation_key uuid,
  activation_result jsonb,
  updated_at timestamptz not null default now(),
  unique(owner_id,campaign_id)
);
create table public.campaign_editor_versions (
  campaign_id uuid not null,
  owner_id text not null,
  revision integer not null check(revision>=0),
  operation_id uuid not null,
  snapshot jsonb not null,
  saved_at timestamptz not null default now(),
  primary key(campaign_id,revision),
  unique(owner_id,operation_id),
  foreign key(owner_id,campaign_id) references public.campaign_editor_drafts(owner_id,campaign_id)
);
alter table public.campaign_editor_drafts enable row level security;
alter table public.campaign_editor_versions enable row level security;
revoke all on public.campaign_editor_drafts,public.campaign_editor_versions from public,anon,authenticated;
grant select,insert,update on public.campaign_editor_drafts to service_role;
grant select,insert on public.campaign_editor_versions to service_role;

create function public.save_campaign_editor_draft(p_owner text,p_id uuid,p_expected integer,p_operation uuid,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare d public.campaign_editor_drafts; c public.campaigns; v public.campaign_editor_versions; s jsonb; step_id uuid; ids uuid[]='{}'; r integer;
begin
  if p_owner is null or p_owner='' or p_expected<0 or p_snapshot is null or jsonb_typeof(p_snapshot->'steps') is distinct from 'array' then raise exception 'invalid_draft'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,731));
  select * into c from public.campaigns where id=p_id for update;
  if found and c.owner_id<>p_owner then raise exception 'not_found'; end if;
  select * into d from public.campaign_editor_drafts where campaign_id=p_id and owner_id=p_owner for update;
  select * into v from public.campaign_editor_versions where owner_id=p_owner and operation_id=p_operation;
  if found then
    if v.campaign_id<>p_id or v.snapshot<>p_snapshot then raise exception 'idempotency_mismatch'; end if;
    return jsonb_build_object('campaignId',p_id,'revision',v.revision,'snapshot',v.snapshot,'savedAt',v.saved_at);
  end if;
  if coalesce(d.revision,0)<>p_expected then raise exception 'revision_conflict'; end if;
  if d.state is not null and d.state<>'draft' then raise exception 'draft_locked'; end if;
  if c.id is not null and (c.status<>'draft' or exists(select 1 from public.campaign_step_runs where campaign_id=p_id)) then raise exception 'revision_required'; end if;
  if c.id is null then
    insert into public.campaigns(id,owner_id,name,script_id,provider,status,live_launched)
    values(p_id,p_owner,coalesce(nullif(p_snapshot->>'name',''),'Untitled campaign'),'builder-'||p_id,'mock','draft',false);
  end if;
  r:=p_expected+1;
  insert into public.campaign_editor_drafts(campaign_id,owner_id,revision,snapshot) values(p_id,p_owner,r,p_snapshot)
    on conflict(campaign_id) do update set revision=r,snapshot=p_snapshot,updated_at=now();
  -- Capture existing step/metadata state before first edit, independently of the client.
  if p_expected=0 and c.id is not null then
    insert into public.campaign_editor_versions(campaign_id,owner_id,revision,operation_id,snapshot)
    select p_id,p_owner,0,gen_random_uuid(),jsonb_build_object('id',p_id,'name',c.name,
      'description',coalesce(meta.bp->>'description',''),'audience',coalesce(meta.bp->>'audience','Selected contacts'),
      'goals',coalesce(meta.bp->'goals','[]'::jsonb),'durationDays',coalesce(meta.bp->'durationDays',to_jsonb(coalesce((select greatest(1,ceil(max(delay_minutes)/1440.0)::int+1) from public.campaign_steps where campaign_id=p_id and owner_id=p_owner),1))),'stats',jsonb_build_object('reach',0,'replies',0,'responseRate',0),
      'steps',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',x.id,'order',x.step_order,'type',x.type,'title',x.title,
        'description',coalesce(x.description,''),'delayMinutes',x.delay_minutes,'dayLabel',coalesce(x.day_label,'Day 1'),
        'timeLabel',coalesce(x.time_label,'9:00 AM'),'status','draft','voiceAssetId',x.voice_asset_id,
        'attachments',x.conditions->'attachments','reviewRequest',x.conditions->'reviewRequest','resourceKey',x.conditions->'resourceKey')) order by x.step_order)
        from public.campaign_steps x where x.campaign_id=p_id and x.owner_id=p_owner),'[]'::jsonb))
    from (select (select metadata->'blueprint' from public.audit_logs where owner_id=p_owner and entity_id=p_id and metadata ? 'blueprint' order by created_at desc limit 1) bp) meta;
  end if;
  perform set_config('myari.campaign_editor_write',p_id::text,true);
  -- Project draft steps atomically. Existing IDs retained; active/history-bearing campaigns are never rewritten.
  for s in select value from jsonb_array_elements(p_snapshot->'steps') loop
    if nullif(s->>'voiceAssetId','') is not null and not exists(select 1 from public.voice_assets where id=(s->>'voiceAssetId')::uuid and owner_id=p_owner) then raise exception 'invalid_voice_owner'; end if;
    step_id:=case when s->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (s->>'id')::uuid else md5(p_id::text||':'||(s->>'id'))::uuid end;
    if step_id=any(ids) or exists(select 1 from public.campaign_steps where id=step_id and (owner_id<>p_owner or campaign_id<>p_id)) then raise exception 'invalid_step_id'; end if;
    ids:=array_append(ids,step_id);
    insert into public.campaign_steps(id,owner_id,campaign_id,step_order,type,title,description,delay_minutes,day_label,time_label,conditions,voice_asset_id,status)
    values(step_id,p_owner,p_id,(s->>'order')::int,case when s->>'type'='retargeting' then 'email' else s->>'type' end,
      coalesce(s->>'title',''),coalesce(s->>'description',''),coalesce((s->>'delayMinutes')::int,greatest(0,coalesce(nullif(regexp_replace(s->>'dayLabel','[^0-9]','','g'),''),'1')::int-1)*1440),
      s->>'dayLabel',s->>'timeLabel',jsonb_strip_nulls(jsonb_build_object('voiceAssetId',s->'voiceAssetId','attachments',s->'attachments','reviewRequest',s->'reviewRequest','resourceKey',s->'resourceKey')),
      nullif(s->>'voiceAssetId','')::uuid,'draft')
    on conflict(id) do update set step_order=excluded.step_order,type=excluded.type,title=excluded.title,description=excluded.description,
      delay_minutes=excluded.delay_minutes,day_label=excluded.day_label,time_label=excluded.time_label,conditions=excluded.conditions,voice_asset_id=excluded.voice_asset_id;
  end loop;
  delete from public.campaign_steps where campaign_id=p_id and owner_id=p_owner and not(id=any(ids));
  update public.campaigns set name=coalesce(nullif(p_snapshot->>'name',''),'Untitled campaign'),updated_at=now() where id=p_id and owner_id=p_owner;
  insert into public.campaign_editor_versions(campaign_id,owner_id,revision,operation_id,snapshot) values(p_id,p_owner,r,p_operation,p_snapshot);
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,'CAMPAIGN_DRAFT_SAVED','campaign',p_id,jsonb_build_object('revision',r,'operationId',p_operation,'blueprint',p_snapshot));
  return jsonb_build_object('campaignId',p_id,'revision',r,'snapshot',p_snapshot,'savedAt',now());
end $$;

create function public.claim_campaign_editor_activation(p_owner text,p_id uuid,p_revision integer,p_key uuid,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare d public.campaign_editor_drafts;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,731));
  select * into d from public.campaign_editor_drafts where campaign_id=p_id and owner_id=p_owner for update;
  if not found then raise exception 'not_found'; end if;
  if d.revision<>p_revision or d.snapshot<>p_snapshot then raise exception 'revision_conflict'; end if;
  if d.state='activated' and d.activation_key=p_key then return d.activation_result; end if;
  if d.state<>'draft' then raise exception 'activation_in_progress_or_blocked'; end if;
  if not exists(select 1 from public.campaigns where id=p_id and owner_id=p_owner and status='draft' and not live_launched) then raise exception 'draft_locked'; end if;
  update public.campaign_editor_drafts set state='activating',activation_key=p_key where campaign_id=p_id and owner_id=p_owner;
  return jsonb_build_object('claimed',true);
end $$;
create function public.finish_campaign_editor_activation(p_owner text,p_id uuid,p_key uuid,p_result jsonb,p_success boolean)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  perform 1 from public.campaign_editor_drafts where campaign_id=p_id and owner_id=p_owner and activation_key=p_key and state='activating' for update;
  if not found then raise exception 'activation_claim_required'; end if;
  update public.campaign_editor_drafts set state=case when p_success then 'activated' else 'blocked' end,activation_result=p_result where campaign_id=p_id and owner_id=p_owner;
  perform set_config('myari.campaign_editor_write',p_id::text,true);
  if p_success then update public.campaigns set status='queued',updated_at=now() where id=p_id and owner_id=p_owner; end if;
  insert into public.audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,case when p_success then 'CAMPAIGN_ACTIVATED' else 'CAMPAIGN_ACTIVATION_BLOCKED' end,'campaign',p_id,p_result);
end $$;
-- Other/legacy writers must not bypass the versioned editor while a draft is managed.
create function public.protect_campaign_editor_projection() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare target uuid;
begin
  if tg_table_name='campaigns' then target:=old.id;
  elsif tg_op='DELETE' then target:=old.campaign_id;
  else target:=new.campaign_id; end if;
  perform pg_advisory_xact_lock(hashtextextended(target::text,731));
  if exists(select 1 from public.campaign_editor_drafts where campaign_id=target and state<>'activated')
     and current_setting('myari.campaign_editor_write',true) is distinct from target::text then raise exception 'versioned_draft_required'; end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger protect_campaign_editor_campaign before update or delete on public.campaigns for each row execute function public.protect_campaign_editor_projection();
create trigger protect_campaign_editor_steps before insert or update or delete on public.campaign_steps for each row execute function public.protect_campaign_editor_projection();
revoke all on function public.protect_campaign_editor_projection() from public,anon,authenticated;
revoke all on function public.save_campaign_editor_draft(text,uuid,integer,uuid,jsonb),public.claim_campaign_editor_activation(text,uuid,integer,uuid,jsonb),public.finish_campaign_editor_activation(text,uuid,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_campaign_editor_draft(text,uuid,integer,uuid,jsonb),public.claim_campaign_editor_activation(text,uuid,integer,uuid,jsonb),public.finish_campaign_editor_activation(text,uuid,uuid,jsonb,boolean) to service_role;
commit;
