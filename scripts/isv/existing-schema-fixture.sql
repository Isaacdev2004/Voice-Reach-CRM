alter table contacts add column sequence_active text,add column updated_at timestamptz;
create table inbound_communications(owner_id text,provider_id text,kind text,contact_id uuid,from_number text,to_number text,body text,status text,classification text);
create table communication_suppressions(owner_id text,phone text,channel text,reason text,primary key(owner_id,phone,channel));
create table engagement_events(owner_id text,contact_id uuid,event_type text,channel text,metadata jsonb);
create table campaign_recipients(id uuid,owner_id text,contact_id uuid);
create table campaign_step_runs(owner_id text,recipient_id uuid,status text,result jsonb);
grant select,insert on inbound_communications,communication_suppressions,engagement_events to service_role;
grant select,update on contacts,campaign_step_runs to service_role;
grant select on campaign_recipients to service_role;

create table audit_logs(owner_id text,action text,entity_type text,metadata jsonb);
grant insert on audit_logs to service_role;

create table outbound_messages(id uuid primary key,owner_id text,provider text,provider_message_id text);
create table outbound_delivery_events(owner_id text,message_id uuid,provider text,event_key text unique,event_type text,occurred_at timestamptz,source text,error_code text);
grant select on outbound_messages to service_role;
grant insert on outbound_delivery_events to service_role;
