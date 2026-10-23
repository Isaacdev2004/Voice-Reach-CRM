-- Optional compatibility repair; test in development. Do not apply automatically.
-- The current API uses the same audit document with atomic revision checks directly,
-- so normal Calendar preferences no longer depend on this RPC being installed.
create or replace function public.save_calendar_preferences(p_owner text,p_preferences jsonb,p_expected uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare h text; document_id uuid; latest uuid; saved uuid; existing uuid;
begin
 if p_owner is null or btrim(p_owner)='' or jsonb_typeof(p_preferences) is distinct from 'object' then raise exception 'invalid preferences'; end if;
 h:=md5('myari-calendar-preferences:'||p_owner);
 document_id:=format('%s-%s-4%s-a%s-%s',substr(h,1,8),substr(h,9,4),substr(h,14,3),substr(h,18,3),substr(h,21,12))::uuid;
 perform pg_advisory_xact_lock(hashtextextended('calendar-preferences:'||p_owner,0));
 select id,(metadata->>'revision')::uuid into existing,latest from audit_logs where owner_id=p_owner and id=document_id and entity_type='calendar_preferences_private' for update;
 if existing is null then
  select id into latest from audit_logs where owner_id=p_owner and entity_type='calendar_preferences' and action='CALENDAR_PREFERENCES_SAVED' order by created_at desc,id desc limit 1;
 end if;
 if latest is distinct from p_expected then raise exception 'stale preferences'; end if;
 saved:=gen_random_uuid();
 if existing is null then
  insert into audit_logs(id,owner_id,action,entity_type,metadata) values(document_id,p_owner,'CALENDAR_PREFERENCES_DOCUMENT','calendar_preferences_private',jsonb_build_object('preferences',p_preferences,'revision',saved));
 else
  update audit_logs set metadata=jsonb_build_object('preferences',p_preferences,'revision',saved) where id=document_id and owner_id=p_owner and metadata->>'revision'=p_expected::text;
  if not found then raise exception 'stale preferences'; end if;
 end if;
 return saved;
end $$;
revoke all on function public.save_calendar_preferences(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.save_calendar_preferences(text,jsonb,uuid) to service_role;
