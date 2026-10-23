-- Serialize account preference writes without deleting existing audit history.
create or replace function public.save_subscriber_settings(p_owner text,p_expected text,p_settings jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_settings jsonb;next_settings jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('settings:'||p_owner,0));
 select metadata->'settings' into current_settings from audit_logs where owner_id=p_owner and entity_type='user_settings' and action='SETTINGS_SAVED' order by created_at desc,id desc limit 1;
 if current_settings is not null and (current_settings-'updatedAt')=(p_settings-'updatedAt') then return current_settings;end if;
 if current_settings is not null and (current_settings->>'updatedAt') is distinct from p_expected then raise exception 'SETTINGS_CONFLICT';end if;
 next_settings=jsonb_set(p_settings,'{updatedAt}',to_jsonb(to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')));
 insert into audit_logs(owner_id,action,entity_type,metadata) values(p_owner,'SETTINGS_SAVED','user_settings',jsonb_build_object('settings',next_settings));
 return next_settings;
end $$;
revoke all on function public.save_subscriber_settings(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_subscriber_settings(text,text,jsonb) to service_role;
-- Private original-quality brand images. Browser roles cannot directly enumerate this bucket.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brand-assets','brand-assets',false,4194304,array['image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
