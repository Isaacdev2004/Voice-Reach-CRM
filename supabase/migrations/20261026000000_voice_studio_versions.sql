-- Immutable recordings remain separate voice_assets rows; script edits never overwrite audio.
alter table public.voice_assets add column if not exists studio_metadata jsonb not null default '{}'::jsonb;
create table if not exists public.voice_script_drafts (
 id uuid primary key default gen_random_uuid(), owner_id text not null,
 title text not null default 'Untitled script', script text not null default '',
 category text not null default 'General', archived boolean not null default false,
 updated_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index if not exists voice_script_drafts_owner on public.voice_script_drafts(owner_id, updated_at desc);
alter table public.voice_script_drafts enable row level security;
revoke all on public.voice_script_drafts from anon, authenticated;
grant all on public.voice_script_drafts to service_role;

-- Claims serialize on the provider voice ID so two subscribers cannot claim the same private voice.
create or replace function public.claim_subscriber_voice(p_owner text,p_voice text,p_label text,p_sample uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare existing record;result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('voice:'||p_voice,0));
 if exists(select 1 from voice_profiles where provider_voice_id=p_voice and owner_id<>p_owner) then raise exception 'VOICE_UNAVAILABLE';end if;
 if p_sample is not null and not exists(select 1 from voice_assets where id=p_sample and owner_id=p_owner) then raise exception 'VOICE_UNAVAILABLE';end if;
 select * into existing from voice_profiles where owner_id=p_owner and provider_voice_id=p_voice order by created_at limit 1;
 if existing.id is not null then select to_jsonb(p) into result from voice_profiles p where p.id=existing.id and p.owner_id=p_owner;return result;end if;
 insert into voice_profiles(owner_id,provider,provider_voice_id,label,sample_asset_id) values(p_owner,'elevenlabs',p_voice,p_label,p_sample) returning to_jsonb(voice_profiles.*) into result;
 return result;
end $$;
revoke all on function public.claim_subscriber_voice(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.claim_subscriber_voice(text,text,text,uuid) to service_role;
