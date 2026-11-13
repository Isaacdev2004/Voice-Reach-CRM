const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { PGlite } = require(
  process.env.MYARI_PGLITE_MODULE || "@electric-sql/pglite",
);
(async () => {
  const db = new PGlite();
  let checks = 0;
  const q = async (s, p) => (await db.query(s, p)).rows;
  const ok = (v) => {
    assert(v);
    checks++;
  };
  const denied = async (s, p) => {
    let failed = false;
    try {
      await q(s, p);
    } catch {
      failed = true;
    }
    ok(failed);
  };
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create table contacts(id uuid primary key,owner_id text,phone text,dnc boolean default false,opt_out_requested boolean default false);grant select on contacts to service_role;",
  );
  await db.exec(
    fs.readFileSync(
      path.join(__dirname, "isv/existing-schema-fixture.sql"),
      "utf8",
    ),
  );
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "../supabase/migrations/20261113201305_isv_sms_infrastructure.sql",
    ),
    "utf8",
  );
  await db.exec("begin;" + sql.replace(/^begin;|^commit;/gm, "") + "rollback;");
  ok(
    (await q("select to_regclass('public.isv_sms_assignments') as t"))[0].t ===
      null,
  );
  await db.exec(sql);
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    account = "AC" + "a".repeat(32),
    phone = "+14075550100";
  await q(
    "insert into contacts(id,owner_id,phone) values($1,$2,$3),($4,$5,$6)",
    [id(1), "A", phone, id(2), "B", phone],
  );
  await q(
    "insert into isv_sending_businesses(id,owner_id,legal_name,website,responsible_party,verified_at) values($1,$2,$3,$4,$5,now()),($6,$7,$8,$4,$5,now())",
    [
      id(3),
      "A",
      "Synthetic A",
      "https://example.test",
      "agent",
      id(4),
      "B",
      "Synthetic B",
    ],
  );
  const envelope = {
    version: 1,
    keyId: "test",
    iv: "nonce",
    tag: "tag",
    ciphertext: "synthetic",
  };
  await q(
    "insert into isv_provider_credentials(owner_id,account_sid,envelope) values($1,$2,$3)",
    ["A", account, envelope],
  );
  await q(
    "insert into isv_sms_assignments(id,owner_id,business_id,account_sid,brand_sid,campaign_sid,messaging_service_sid,from_number,approved_purpose,registration_status,number_associated,verified_at,provider_evidence_reference,messaging_enabled,verification_source) values($1,'A',$2,$3,'BNsynthetic','CMsynthetic','MGsynthetic',$4,'followup','approved',true,now(),'synthetic fixture',true,'twilio_api')",
    [id(5), id(3), account, "+14075550199"],
  );
  const consent = async (owner, contact, business, status = "granted") =>
    q(
      "insert into isv_sms_consent(owner_id,business_id,contact_id,campaign_sid,phone,purpose,status,source,disclosure_version,proof_reference,captured_at) values($1,$2,$3,'CMsynthetic',$4,'followup',$5,'synthetic','v1','synthetic evidence',now())",
      [owner, business, contact, phone, status],
    );
  await denied(
    "insert into isv_sms_consent(owner_id,business_id,contact_id,campaign_sid,phone,purpose,status,source,disclosure_version,proof_reference,captured_at) values('A',$1,$2,'CMsynthetic',$3,'followup','granted','test','v1','test',now())",
    [id(3), id(2), phone],
  );
  const claim = (key, owner = "A", contact = id(1)) =>
    q("select isv_claim_sms($1,$2,$3,$4,$5,$6) as ok", [
      owner,
      id(5),
      contact,
      phone,
      key,
      "hash",
    ]);
  ok(!(await claim("missing-consent"))[0].ok);
  await consent("A", id(1), id(3));
  await db.exec("set role service_role");
  ok((await claim("first"))[0].ok);
  ok(!(await claim("first"))[0].ok);
  ok(!(await claim("other", "B", id(2)))[0].ok);
  ok(!(await claim("wrong-contact", "A", id(2)))[0].ok);
  await q(
    "update isv_sms_assignments set verified_at=now()-interval '2 days' where owner_id='A'",
  );
  ok(!(await claim("stale"))[0].ok);
  await q(
    "update isv_sms_assignments set verified_at=now(),registration_status='pending' where owner_id='A'",
  );
  ok(!(await claim("pending"))[0].ok);
  await q(
    "update isv_sms_assignments set registration_status='approved' where owner_id='A'",
  );
  const receive = (sid, hash = "body", kind = "stop", contact = id(1)) =>
    q("select isv_receive_sms($1,$2,$3,$4,$5,$6,$7,$8) as ok", [
      "A",
      id(5),
      sid,
      hash,
      phone,
      "STOP",
      kind,
      contact,
    ]);
  ok((await receive("SMstop"))[0].ok);
  ok(!(await receive("SMstop"))[0].ok);
  await denied("select isv_receive_sms($1,$2,$3,$4,$5,$6,$7,$8)", [
    "A",
    id(5),
    "SMstop",
    "tampered",
    phone,
    "STOP",
    "stop",
    id(1),
  ]);
  ok(!(await claim("post-stop"))[0].ok);
  ok(
    (
      await q(
        "select count(*)::int as n from inbound_communications where owner_id='A'",
      )
    )[0].n === 1,
  );
  ok(
    (
      await q(
        "select count(*)::int as n from engagement_events where owner_id='A' and event_type='opt_out'",
      )
    )[0].n === 1,
  );
  ok(
    (await q("select dnc from contacts where id=$1", [id(1)]))[0].dnc === true,
  );
  await q(
    "update isv_sms_dispatches set provider_sid='SMdelivered' where owner_id='A' and operation_key='first'",
  );
  await db.exec("reset role");
  await q(
    "insert into outbound_messages values($1,'A','twilio','SMdelivered')",
    [id(20)],
  );
  await db.exec("set role service_role");
  ok(
    (
      await q(
        "select isv_record_delivery('A',$1,'SMdelivered','delivered','hash') as ok",
        [id(5)],
      )
    )[0].ok,
  );
  ok(
    !(
      await q(
        "select isv_record_delivery('A',$1,'SMdelivered','delivered','hash') as ok",
        [id(5)],
      )
    )[0].ok,
  );
  await db.exec("reset role");
  ok(
    (
      await q(
        "select count(*)::int as n from outbound_delivery_events where owner_id='A'",
      )
    )[0].n === 1,
  );
  await db.exec("set role service_role");
  ok(
    (await q("select count(*)::int as n from isv_sms_suppressions"))[0].n === 1,
  );
  ok(
    (
      await q(
        "select count(*)::int as n from isv_sms_audit where event='STOP_SUPPRESSED'",
      )
    )[0].n === 1,
  );
  await denied("select isv_receive_sms($1,$2,$3,$4,$5,$6,$7,$8)", [
    "A",
    id(5),
    "SMwrong",
    "body",
    phone,
    "hello",
    "reply",
    id(2),
  ]);
  ok(
    (
      await q(
        "select count(*)::int as n from isv_webhook_receipts where event_sid='SMwrong'",
      )
    )[0].n === 0,
  );
  ok(
    (
      await q("select isv_rotate_credential($1,$2,$3,$4) as ok", [
        "A",
        account,
        1,
        envelope,
      ])
    )[0].ok,
  );
  ok(
    !(
      await q("select isv_rotate_credential($1,$2,$3,$4) as ok", [
        "A",
        account,
        1,
        envelope,
      ])
    )[0].ok,
  );
  // Normalized numbers associate correctly, but duplicate owned contacts remain unassociated.
  await q("update contacts set phone='(407) 555-0100' where id=$1",[id(1)]);
  await q("select isv_receive_sms('A',$1,'SMformatted','format',$2,'hello','reply',null)",[id(5),phone]);
  ok((await q("select contact_id from isv_inbound_messages where message_sid='SMformatted'"))[0].contact_id===id(1));
  await db.exec('reset role');await q("insert into contacts(id,owner_id,phone) values($1,'A',$2)",[id(22),phone]);await db.exec('set role service_role');
  await q("select isv_receive_sms('A',$1,'SMambiguous','ambiguous',$2,'hello','reply',null)",[id(5),phone]);
  ok((await q("select contact_id from isv_inbound_messages where message_sid='SMambiguous'"))[0].contact_id===null);
  // A signed callback can precede the provider response and CRM reference persistence.
  ok((await q("select isv_record_delivery('A',$1,'SMearly','delivered','early') as ok",[id(5)]))[0].ok);
  await q("update isv_sms_dispatches set provider_sid='SMearly' where owner_id='A' and operation_key='first'");
  await db.exec('reset role');await q("insert into outbound_messages values($1,'A','twilio','SMearly')",[id(21)]);await db.exec('set role service_role');
  ok((await q("select isv_project_delivery('A',$1) as n",[id(21)]))[0].n===1);
  ok((await q("select isv_project_delivery('A',$1) as n",[id(21)]))[0].n===0);
  ok((await q("select isv_project_delivery('B',$1) as n",[id(21)]))[0].n===0);
  const submitted = await q(
    "select isv_save_registration('A','Updated Synthetic','https://example.test','brokerage','synthetic authorization','version2') as id",
  );
  ok(submitted[0].id === id(3));
  ok(
    (
      await q(
        "select verified_at from isv_sending_businesses where owner_id='A'",
      )
    )[0].verified_at === null,
  );
  ok(
    (
      await q(
        "select messaging_enabled from isv_sms_assignments where owner_id='A'",
      )
    )[0].messaging_enabled === false,
  );
  for (const role of ["anon", "authenticated"]) {
    await db.exec("reset role;set role " + role);
    await denied("select * from isv_provider_credentials");
    await denied("select isv_claim_sms($1,$2,$3,$4,$5,$6)", [
      "A",
      id(5),
      id(1),
      phone,
      "client",
      "hash",
    ]);
  }
  await db.exec("reset role");
  const policies = await q(
    "select relname,relrowsecurity from pg_class where relname like 'isv_%' and relkind='r'",
  );
  ok(policies.length === 9 && policies.every((r) => r.relrowsecurity));
  // Concurrent promises on one embedded PostgreSQL connection prove serialized ordering, not a multi-backend race test.
  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, n) => claim("queued-" + n)),
  );
  ok(responses.every((r) => !r[0].ok));
  await db.close();
  console.log(
    JSON.stringify({
      result: "PASS",
      checks,
      engine: "PGlite PostgreSQL",
      scope:
        "Migration, transactional rollback, grants, RLS, ownership, replay, STOP, rotation CAS; multi-backend concurrency still requires hosted PostgreSQL",
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
