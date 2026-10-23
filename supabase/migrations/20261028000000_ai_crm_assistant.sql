-- Apply to isolated staging first. No outbound/provider access is granted.
begin;
create table public.ai_conversations(id uuid primary key default gen_random_uuid(), owner_id text not null, title text not null, created_at timestamptz not null default now());
create table public.ai_turns(id uuid primary key default gen_random_uuid(), owner_id text not null, conversation_id uuid not null references public.ai_conversations(id) on delete cascade, position bigint generated always as identity, role text not null check(role in ('user','assistant')), content text not null, result jsonb, created_at timestamptz not null default now());
create table public.ai_proposals(id uuid primary key default gen_random_uuid(),owner_id text not null,conversation_id uuid not null references public.ai_conversations(id) on delete cascade,request_id uuid not null,payload jsonb not null,status text not null default 'proposed' check(status in ('proposed','approved','saved','dismissed')),record_id uuid,created_at timestamptz not null default now());
create table public.ai_usage(owner_id text not null,window_start timestamptz not null,requests integer not null default 0,primary key(owner_id,window_start));
create index ai_conversations_owner on public.ai_conversations(owner_id,created_at desc);
create index ai_turns_owner on public.ai_turns(owner_id,conversation_id,created_at);
create index ai_proposals_owner on public.ai_proposals(owner_id,conversation_id);
alter table public.ai_conversations enable row level security;
alter table public.ai_turns enable row level security;
alter table public.ai_proposals enable row level security;
alter table public.ai_usage enable row level security;
revoke all on public.ai_conversations,public.ai_turns,public.ai_proposals,public.ai_usage from public,anon,authenticated;
grant all on public.ai_conversations,public.ai_turns,public.ai_proposals,public.ai_usage to service_role;
grant usage,select on sequence public.ai_turns_position_seq to service_role;
create function public.claim_ai_usage(p_owner text) returns boolean language plpgsql security invoker set search_path=public as $$
declare used integer; bucket timestamptz:=date_trunc('hour',now());daily integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner,281));
 select coalesce(sum(requests),0) into daily from ai_usage where owner_id=p_owner and window_start>=date_trunc('day',now());
 if daily>=100 then return false;end if;
 insert into ai_usage values(p_owner,bucket,1) on conflict(owner_id,window_start) do update set requests=ai_usage.requests+1 where ai_usage.requests<20 returning requests into used;
 return used is not null;
end $$;
-- Exact stored proposal is approved under a row lock. Retries cannot duplicate records.
create function public.approve_ai_proposal(p_owner text,p_id uuid,p_approve boolean) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.ai_proposals; c uuid; k text; target uuid:=gen_random_uuid();
begin
 select * into r from ai_proposals where owner_id=p_owner and id=p_id for update;
 if not found then raise exception 'PROPOSAL_NOT_FOUND';end if;
 if r.status<>'proposed' then return to_jsonb(r);end if;
 if not p_approve then update ai_proposals set status='dismissed' where owner_id=p_owner and id=p_id returning * into r;return to_jsonb(r);end if;
 c:=nullif(r.payload->>'contactId','')::uuid;k:=r.payload->>'kind';
 if c is not null then perform 1 from contacts where owner_id=p_owner and id=c for key share;if not found then raise exception 'CONTACT_NOT_FOUND';end if;end if;
 if k in ('task','reminder','contact_note') and c is null then raise exception 'CONTACT_REQUIRED';end if;
 if k in ('task','reminder') then
  insert into contact_tasks(id,owner_id,contact_id,title,notes,due_at,reminder_at,completed)
  values(target,p_owner,c,r.payload->>'title',r.payload->>'body',nullif(r.payload->>'dueAt','')::timestamptz,case when k='reminder' then nullif(r.payload->>'dueAt','')::timestamptz else null end,false);
 elsif k='contact_note' then
  insert into contact_notes(id,owner_id,contact_id,title,body,kind) values(target,p_owner,c,r.payload->>'title',r.payload->>'body','note');
 else target:=null;end if;
 update ai_proposals set status=case when target is null then 'approved' else 'saved' end,record_id=target where owner_id=p_owner and id=p_id returning * into r;
 insert into audit_logs(owner_id,action,entity_type,entity_id,metadata) values(p_owner,'AI_PROPOSAL_APPROVED','ai_proposal',p_id,jsonb_build_object('kind',k,'recordId',target,'execution',case when target is null then 'draft_only' else 'internal_record' end));
 return to_jsonb(r);
end $$;
revoke all on function public.claim_ai_usage(text),public.approve_ai_proposal(text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.claim_ai_usage(text),public.approve_ai_proposal(text,uuid,boolean) to service_role;
create function public.save_ai_exchange(p_owner text,p_conversation uuid,p_request uuid,p_message text,p_result jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare item jsonb; proposals jsonb; previous jsonb;
begin
 perform 1 from ai_conversations where owner_id=p_owner and id=p_conversation for update;
 if not found then raise exception 'CONVERSATION_NOT_FOUND';end if;
 select result into previous from ai_turns where owner_id=p_owner and id=p_request;
 if found then return previous;end if;
 for item in select value from jsonb_array_elements(p_result->'actions') loop
  if item->>'contactId' is not null then
   perform 1 from contacts where owner_id=p_owner and id=(item->>'contactId')::uuid for key share;
   if not found then raise exception 'CONTACT_NOT_FOUND';end if;
  end if;
  insert into ai_proposals(owner_id,conversation_id,request_id,payload) values(p_owner,p_conversation,p_request,item);
 end loop;
 select coalesce(jsonb_agg(to_jsonb(p)-'owner_id'-'conversation_id'),'[]') into proposals from ai_proposals p where owner_id=p_owner and conversation_id=p_conversation and request_id=p_request;
 previous:=jsonb_build_object('reply',p_result-'actions','proposals',proposals);
 insert into ai_turns(id,owner_id,conversation_id,role,content,result) values(p_request,p_owner,p_conversation,'user',p_message,previous);
 insert into ai_turns(owner_id,conversation_id,role,content,result) values(p_owner,p_conversation,'assistant',p_result->>'answer',p_result-'actions');
 return previous;
end $$;
revoke all on function public.save_ai_exchange(text,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_ai_exchange(text,uuid,uuid,text,jsonb) to service_role;
create function public.revise_ai_proposal(p_owner text,p_id uuid,p_expected jsonb,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare r public.ai_proposals;c uuid;
begin
 select * into r from ai_proposals where owner_id=p_owner and id=p_id for update;
 if not found or r.status<>'proposed' or r.payload<>p_expected or r.payload->>'kind'<>p_payload->>'kind' then raise exception 'PROPOSAL_CONFLICT';end if;
 c:=nullif(p_payload->>'contactId','')::uuid;
 if c is not null then perform 1 from contacts where owner_id=p_owner and id=c for key share;if not found then raise exception 'CONTACT_NOT_FOUND';end if;end if;
 update ai_proposals set payload=p_payload where owner_id=p_owner and id=p_id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.revise_ai_proposal(text,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.revise_ai_proposal(text,uuid,jsonb,jsonb) to service_role;
commit;
