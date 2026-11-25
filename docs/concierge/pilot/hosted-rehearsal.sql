-- Isolated project jojgdfpmaxvbhobjrsbm ONLY. No schema changes, no intermediate COMMIT.
BEGIN;
SET LOCAL statement_timeout = '12s';
DO $rehearsal$
DECLARE
 a text := 'concierge-pilot-rehearsal-20261028-a';
 b text := 'concierge-pilot-rehearsal-20261028-b';
 request_id uuid := '73bde3ba-1b8f-4c4d-944c-8e91de11a301';
 job_id uuid := '73bde3ba-1b8f-4c4d-944c-8e91de11a302';
 rejected boolean;
 result jsonb;
 r record;
BEGIN
 IF EXISTS(SELECT 1 FROM concierge_cases WHERE owner_id IN(a,b)) THEN RAISE EXCEPTION 'FIXTURE_COLLISION'; END IF;
 FOR r IN SELECT c.oid,c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('concierge_cases','concierge_events','concierge_imports') LOOP
  IF NOT r.relrowsecurity OR has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE') THEN RAISE EXCEPTION 'TABLE_PERMISSION_FAILURE'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('concierge_cases','concierge_events','concierge_imports'))<>3 THEN RAISE EXCEPTION 'MISSING_TABLE'; END IF;
 FOR r IN SELECT p.oid,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN('mutate_concierge_case','execute_concierge_import') LOOP
  IF r.prosecdef OR has_function_privilege('anon',r.oid,'EXECUTE') OR has_function_privilege('authenticated',r.oid,'EXECUTE') OR NOT has_function_privilege('service_role',r.oid,'EXECUTE') THEN RAISE EXCEPTION 'RPC_PERMISSION_FAILURE'; END IF;
 END LOOP;
 result:=mutate_concierge_case(a,a,request_id,0,'{"discovery":{"agentName":"Synthetic Concierge Pilot","market":"Synthetic","goals":"Test"}}','DISCOVERY_SAVED');
 IF (result->>'version')::integer<>1 THEN RAISE EXCEPTION 'CREATE_FAILED'; END IF;
 PERFORM mutate_concierge_case(a,a,request_id,0,'{"discovery":{"agentName":"Synthetic Concierge Pilot","market":"Synthetic","goals":"Test"}}','DISCOVERY_SAVED');
 IF (SELECT count(*) FROM concierge_events WHERE owner_id=a)<>1 THEN RAISE EXCEPTION 'REPLAY_NOT_IDEMPOTENT'; END IF;
 rejected:=false;
 BEGIN PERFORM mutate_concierge_case(b,b,request_id,0,'{}','DISCOVERY_SAVED'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%REPLAY%' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'CROSS_OWNER_REPLAY_ALLOWED'; END IF;
 rejected:=false;
 BEGIN PERFORM mutate_concierge_case(a,a,gen_random_uuid(),0,'{}','DISCOVERY_SAVED'); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%STALE%' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'STALE_UPDATE_ALLOWED'; END IF;
 PERFORM mutate_concierge_case(b,b,gen_random_uuid(),0,'{}','DISCOVERY_SAVED');
 INSERT INTO concierge_imports(id,owner_id,fingerprint,rows) VALUES(job_id,a,'concierge-pilot-rehearsal-20261028','[{"firstName":"Synthetic Concierge Pilot","phone":"+15555550981"},{"firstName":"Synthetic duplicate","phone":"+15555550981"}]');
 rejected:=false;
 BEGIN PERFORM execute_concierge_import(b,job_id,10); EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%NOT_FOUND%' THEN RAISE; END IF; rejected:=true; END;
 IF NOT rejected THEN RAISE EXCEPTION 'CROSS_OWNER_IMPORT_ALLOWED'; END IF;
 result:=execute_concierge_import(a,job_id,10);
 IF (result->>'imported')::integer<>1 OR (result->>'duplicatesSkipped')::integer<>1 THEN RAISE EXCEPTION 'IMPORT_ASSERTION_FAILED'; END IF;
 IF (execute_concierge_import(a,job_id,10)->>'imported')::integer<>1 THEN RAISE EXCEPTION 'IMPORT_REPLAY_FAILED'; END IF;
 IF (SELECT count(*) FROM contacts WHERE owner_id=a)<>1 OR EXISTS(SELECT 1 FROM contacts WHERE owner_id=a AND dnc IS DISTINCT FROM true) OR (SELECT count(*) FROM consent_records WHERE owner_id=a AND status='Unknown')<>1 THEN RAISE EXCEPTION 'CONSENT_OR_SUPPRESSION_FAILURE'; END IF;
 IF EXISTS(SELECT 1 FROM concierge_imports WHERE id=job_id AND rows<>'[]'::jsonb) THEN RAISE EXCEPTION 'PAYLOAD_NOT_CLEARED'; END IF;
 IF (SELECT count(*) FROM concierge_events WHERE owner_id=a AND action='IMPORT_COMPLETED')<>1 THEN RAISE EXCEPTION 'AUDIT_FAILURE'; END IF;
END $rehearsal$;
SELECT 'PASS: all hosted SQL assertions completed; ROLLBACK follows' AS rehearsal;
ROLLBACK;
