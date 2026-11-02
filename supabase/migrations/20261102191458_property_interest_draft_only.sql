-- Additive, Preview-only application feature. No existing-record backfill.
BEGIN;
CREATE TABLE public.property_interest_shares (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL CHECK(length(owner_id)>0),
 contact_id uuid NOT NULL REFERENCES public.contacts(id), property_key text NOT NULL CHECK(property_key ~ '^zillow:[0-9]+$'),
 zillow_url text NOT NULL CHECK(zillow_url ~ '^https://www[.]zillow[.]com/homedetails/'),
 label text NOT NULL CHECK(length(label) BETWEEN 1 AND 140),
 window_days integer NOT NULL DEFAULT 7 CHECK(window_days BETWEEN 1 AND 30),
 capability_hash text NOT NULL UNIQUE CHECK(capability_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '30 days',
 revoked_at timestamptz, UNIQUE(id,owner_id,contact_id,property_key)
);
CREATE TABLE public.property_interest_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), share_id uuid NOT NULL REFERENCES public.property_interest_shares(id),
 share_hash text NOT NULL REFERENCES public.property_interest_shares(capability_hash),
 session_hash text NOT NULL UNIQUE CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 disclosure_version text NOT NULL CHECK(disclosure_version='myari-property-interest-v1'),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '2 hours',
 revoked_at timestamptz
);
CREATE INDEX property_interest_session_share ON public.property_interest_sessions(share_id,started_at);
CREATE TABLE public.property_interest_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id text NOT NULL, contact_id uuid NOT NULL,
 property_key text NOT NULL, share_id uuid NOT NULL,
 session_id uuid NOT NULL UNIQUE REFERENCES public.property_interest_sessions(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), qualified boolean NOT NULL,
 reason text NOT NULL CHECK(reason IN ('qualified','minimum_separation','suppressed')),
 FOREIGN KEY(share_id,owner_id,contact_id,property_key) REFERENCES public.property_interest_shares(id,owner_id,contact_id,property_key)
);
CREATE INDEX property_interest_visit_window ON public.property_interest_events(owner_id,contact_id,property_key,created_at) WHERE qualified;
CREATE TABLE public.property_interest_triggers (
 owner_id text NOT NULL,contact_id uuid NOT NULL REFERENCES public.contacts(id),property_key text NOT NULL,
 campaign_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(owner_id,contact_id,property_key)
);
ALTER TABLE public.property_interest_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_interest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_interest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_interest_triggers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.property_interest_shares,public.property_interest_sessions,public.property_interest_events,public.property_interest_triggers FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT,UPDATE ON public.property_interest_shares,public.property_interest_sessions TO service_role;
GRANT SELECT,INSERT ON public.property_interest_events,public.property_interest_triggers TO service_role;

CREATE FUNCTION public.create_property_interest_share(p_owner text,p_contact uuid,p_property text,p_url text,p_label text,p_days integer,p_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM contacts WHERE id=p_contact AND owner_id=p_owner AND NOT dnc AND NOT opt_out_requested)
 OR EXISTS(SELECT 1 FROM consent_records WHERE contact_id=p_contact AND owner_id=p_owner AND lower(status) IN ('revoked','denied','opted_out','opt_out')) THEN RAISE EXCEPTION 'CONTACT_UNAVAILABLE'; END IF;
 IF p_property !~ '^zillow:[0-9]+$' OR p_url !~ ('^https://www[.]zillow[.]com/homedetails/([A-Za-z0-9_%.,~-]+/)?'||substring(p_property from 8)||'_zpid/$') THEN RAISE EXCEPTION 'INVALID_PROPERTY'; END IF;
 IF (SELECT count(*) FROM property_interest_shares WHERE owner_id=p_owner AND created_at>clock_timestamp()-interval '1 day')>=100 THEN RAISE EXCEPTION 'DAILY_SHARE_LIMIT'; END IF;
 INSERT INTO property_interest_shares(owner_id,contact_id,property_key,zillow_url,label,window_days,capability_hash)
 VALUES(p_owner,p_contact,p_property,p_url,p_label,p_days,p_hash) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.start_property_interest_session(p_share_hash text,p_session_hash text,p_disclosure text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s property_interest_shares;
BEGIN
 SELECT * INTO s FROM property_interest_shares WHERE capability_hash=p_share_hash FOR UPDATE;
 IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'LINK_UNAVAILABLE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM contacts WHERE id=s.contact_id AND owner_id=s.owner_id AND NOT dnc AND NOT opt_out_requested)
 OR EXISTS(SELECT 1 FROM consent_records WHERE contact_id=s.contact_id AND owner_id=s.owner_id AND lower(status) IN ('revoked','denied','opted_out','opt_out')) THEN RAISE EXCEPTION 'CONTACT_UNAVAILABLE'; END IF;
 IF (SELECT count(*) FROM property_interest_sessions WHERE share_id=s.id AND started_at>clock_timestamp()-interval '1 day')>=200 THEN RAISE EXCEPTION 'SESSION_LIMIT'; END IF;
 INSERT INTO property_interest_sessions(share_id,share_hash,session_hash,disclosure_version)
 VALUES(s.id,p_share_hash,p_session_hash,p_disclosure);
 RETURN true;
END $$;

CREATE FUNCTION public.record_property_interest_visit(p_share_hash text,p_session_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE s property_interest_shares; v property_interest_sessions; e property_interest_events;
 v_now timestamptz:=clock_timestamp(); v_reason text:='qualified'; v_count integer; v_campaign uuid; v_trigger boolean:=false;
BEGIN
 SELECT * INTO s FROM property_interest_shares WHERE capability_hash=p_share_hash;
 IF NOT FOUND OR s.revoked_at IS NOT NULL OR s.expires_at<=v_now THEN RAISE EXCEPTION 'LINK_UNAVAILABLE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('property-interest:'||s.owner_id||':'||s.contact_id::text||':'||s.property_key,0));
 -- Serialize against revocation as well as other sessions of this recipient/property.
 SELECT * INTO s FROM property_interest_shares WHERE id=s.id FOR UPDATE;
 IF s.revoked_at IS NOT NULL OR s.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'LINK_UNAVAILABLE'; END IF;
 SELECT * INTO v FROM property_interest_sessions WHERE session_hash=p_session_hash AND share_id=s.id AND share_hash=p_share_hash FOR UPDATE;
 IF NOT FOUND OR v.revoked_at IS NOT NULL OR v.expires_at<=v_now THEN RAISE EXCEPTION 'SESSION_UNAVAILABLE'; END IF;
 IF v.started_at>v_now-interval '15 seconds' THEN RAISE EXCEPTION 'DWELL_REQUIRED'; END IF;
 SELECT * INTO e FROM property_interest_events WHERE session_id=v.id;
 IF FOUND THEN RETURN jsonb_build_object('qualified',e.qualified,'reason',e.reason,'replayed',true); END IF;
 IF NOT EXISTS(SELECT 1 FROM contacts WHERE id=s.contact_id AND owner_id=s.owner_id AND NOT dnc AND NOT opt_out_requested)
 OR EXISTS(SELECT 1 FROM consent_records WHERE contact_id=s.contact_id AND owner_id=s.owner_id AND lower(status) IN ('revoked','denied','opted_out','opt_out')) THEN v_reason:='suppressed';
 ELSIF EXISTS(SELECT 1 FROM property_interest_events WHERE owner_id=s.owner_id AND contact_id=s.contact_id AND property_key=s.property_key AND qualified AND created_at>v_now-interval '30 minutes') THEN v_reason:='minimum_separation'; END IF;
 INSERT INTO property_interest_events(owner_id,contact_id,property_key,share_id,session_id,qualified,reason,created_at)
 VALUES(s.owner_id,s.contact_id,s.property_key,s.id,v.id,v_reason='qualified',v_reason,v_now);
 SELECT count(*) INTO v_count FROM property_interest_events WHERE owner_id=s.owner_id AND contact_id=s.contact_id AND property_key=s.property_key AND qualified AND created_at>=v_now-make_interval(days=>s.window_days);
 IF v_reason='qualified' AND v_count>=3 AND NOT EXISTS(SELECT 1 FROM property_interest_triggers WHERE owner_id=s.owner_id AND contact_id=s.contact_id AND property_key=s.property_key) THEN
  v_campaign:=gen_random_uuid();
  INSERT INTO campaigns(id,owner_id,name,script_id,provider,status,live_launched)
  VALUES(v_campaign,s.owner_id,'Property interest follow-up — '||s.label,'property-interest-'||s.property_key,'mock','draft',false);
  INSERT INTO campaign_steps(owner_id,campaign_id,step_order,type,title,description,delay_minutes,day_label,time_label,status)
  VALUES(s.owner_id,v_campaign,1,'email','A property worth discussing','Hi {{first_name}}, would you like to discuss this property or compare similar options? Please personalize this draft and verify consent before any outreach.',0,'Day 1','10:00 AM','draft'),
        (s.owner_id,v_campaign,2,'task','Review property interest','Activity occurred on the assigned recipient link only. Buyer identity and activity inside Zillow are not verified. Review consent and contact preferences before any action.',1440,'Day 2','10:00 AM','draft');
  INSERT INTO property_interest_triggers(owner_id,contact_id,property_key,campaign_id) VALUES(s.owner_id,s.contact_id,s.property_key,v_campaign);
  INSERT INTO audit_logs(owner_id,action,entity_type,entity_id,metadata)
  VALUES(s.owner_id,'PROPERTY_INTEREST_REVIEW_READY','contact',s.contact_id,jsonb_build_object('title','Property link interest is ready for review','campaignId',v_campaign,'propertyLabel',s.label,'identityAssurance','recipient_link_only','qualifiedVisits',v_count,'windowDays',s.window_days,'sendingSuppressed',true));
  v_trigger:=true;
 END IF;
 RETURN jsonb_build_object('qualified',v_reason='qualified','reason',v_reason,'triggered',v_trigger);
END $$;
REVOKE ALL ON FUNCTION public.create_property_interest_share(text,uuid,text,text,text,integer,text),public.start_property_interest_session(text,text,text),public.record_property_interest_visit(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_property_interest_share(text,uuid,text,text,text,integer,text),public.start_property_interest_session(text,text,text),public.record_property_interest_visit(text,text) TO service_role;
COMMIT;
