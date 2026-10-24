-- Review before production. Existing proposals without a root must be prepared again.
begin;
create table if not exists public.assistant_proposal_roots (
 owner_id text not null,root_id uuid not null,current_proposal_id uuid not null,
 state text not null check(state in ('draft','claimed','cancelled')),
 updated_at timestamptz not null default now(),primary key(owner_id,root_id)
);
alter table public.assistant_proposal_roots enable row level security;
revoke all on public.assistant_proposal_roots from public,anon,authenticated;
grant select,insert,update on public.assistant_proposal_roots to service_role;
create or replace function public.advance_assistant_proposal(p_owner text,p_root uuid,p_proposal uuid,p_expected uuid,p_operation text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.assistant_proposal_roots;
begin
 if p_owner is null or p_owner='' or p_root is null or p_proposal is null then raise exception 'ASSISTANT_INVALID';end if;
 if p_operation='create' then
  if p_root<>p_proposal then raise exception 'ASSISTANT_INVALID';end if;
  insert into public.assistant_proposal_roots(owner_id,root_id,current_proposal_id,state) values(p_owner,p_root,p_proposal,'draft');
 else
  select * into r from public.assistant_proposal_roots where owner_id=p_owner and root_id=p_root for update;
  if not found or r.state<>'draft' then raise exception 'ASSISTANT_ROOT_CLAIMED_OR_MISSING';end if;
  if p_operation='revise' then
   if p_expected is null or r.current_proposal_id<>p_expected then raise exception 'ASSISTANT_SUPERSEDED';end if;
   update public.assistant_proposal_roots set current_proposal_id=p_proposal,updated_at=now() where owner_id=p_owner and root_id=p_root;
  elsif p_operation in ('claim','cancel') then
   if r.current_proposal_id<>p_proposal then raise exception 'ASSISTANT_SUPERSEDED';end if;
   update public.assistant_proposal_roots set state=case when p_operation='claim' then 'claimed' else 'cancelled' end,updated_at=now() where owner_id=p_owner and root_id=p_root;
  else raise exception 'ASSISTANT_INVALID';end if;
 end if;
 select * into r from public.assistant_proposal_roots where owner_id=p_owner and root_id=p_root;
 return to_jsonb(r);
end;$$;
revoke all on function public.advance_assistant_proposal(text,uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.advance_assistant_proposal(text,uuid,uuid,uuid,text) to service_role;
-- Assistant logical attempts remain unique even if a caller loses its response.
-- Audit any historical duplicates before applying this partial index.
create unique index if not exists assistant_outbound_logical_once on public.outbound_messages(owner_id,logical_key) where logical_key like 'assistant-%';

commit;
