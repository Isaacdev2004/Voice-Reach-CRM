/* Refuses non-loopback databases. This test creates synthetic tables/roles in a disposable CI database only. */
const { spawn } = require("node:child_process"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
if (
  process.env.MYARI_ISV_POSTGRES_TEST !== "1" ||
  process.env.PGHOST !== "127.0.0.1" ||
  process.env.PGDATABASE !== "myari_isv_test"
)
  throw Error("An explicit disposable loopback ISV test database is required.");
function sql(input) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      "psql",
      [
        "-X",
        "-q",
        "-t",
        "-A",
        "-v",
        "ON_ERROR_STOP=1",
        "-h",
        "127.0.0.1",
        "-p",
        process.env.PGPORT || "5432",
        "-U",
        "postgres",
        "-d",
        "myari_isv_test",
      ],
      {
        env: {
          PATH: process.env.PATH,
          PGPASSWORD: process.env.PGPASSWORD,
          PGSSLMODE: "disable",
        },
      },
    );
    let out = "",
      err = "";
    p.stdout.on("data", (b) => (out += b));
    p.stderr.on("data", (b) => (err += b));
    p.on("error", reject);
    p.on("exit", (code) => (code ? reject(Error(err)) : resolve(out.trim())));
    p.stdin.end(input);
  });
}
(async () => {
  await sql(
    "create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to service_role;create table contacts(id uuid primary key,owner_id text,phone text,dnc boolean default false,opt_out_requested boolean default false);grant select on contacts to service_role;",
  );
  await sql(
    fs.readFileSync(
      path.join(__dirname, "existing-schema-fixture.sql"),
      "utf8",
    ),
  );
  const migration = fs.readFileSync(
    path.join(
      __dirname,
      "../../supabase/migrations/20261113201305_isv_sms_infrastructure.sql",
    ),
    "utf8",
  );
  await sql(
    "begin;" + migration.replace(/^begin;|^commit;/gm, "") + "rollback;",
  );
  assert.equal(
    await sql("select to_regclass('public.isv_sms_assignments') is null;"),
    "t",
  );
  await sql(migration);
  const business = "00000000-0000-4000-8000-000000000001",
    assignment = "00000000-0000-4000-8000-000000000002",
    contact = "00000000-0000-4000-8000-000000000003",
    account = "AC" + "a".repeat(32),
    phone = "+14075550100";
  await sql(`insert into contacts(id,owner_id,phone,dnc,opt_out_requested) values('${contact}','A','${phone}',false,false);
 insert into isv_sending_businesses(id,owner_id,legal_name,website,responsible_party,verified_at) values('${business}','A','Synthetic CI','https://example.test','agent',now());
 insert into isv_provider_credentials values('A','${account}','{"version":1,"keyId":"test","iv":"test","tag":"test","ciphertext":"test"}',1,now());
 insert into isv_sms_assignments(id,owner_id,business_id,account_sid,brand_sid,campaign_sid,messaging_service_sid,from_number,approved_purpose,registration_status,number_associated,verified_at,provider_evidence_reference,messaging_enabled,verification_source) values('${assignment}','A','${business}','${account}','BNsynthetic','CMsynthetic','MGsynthetic','+14075550199','followup','approved',true,now(),'synthetic',true,'twilio_api');
 insert into isv_sms_consent(owner_id,business_id,contact_id,campaign_sid,phone,purpose,status,source,disclosure_version,proof_reference,captured_at) values('A','${business}','${contact}','CMsynthetic','${phone}','followup','granted','synthetic','v1','synthetic',now());`);
  const claim = (key) =>
    `set role service_role;select isv_claim_sms('A','${assignment}','${contact}','${phone}','${key}','hash');`;
  const stop = (sid) =>
    `set role service_role;select isv_receive_sms('A','${assignment}','${sid}','hash','${phone}','STOP','stop','${contact}');`;
  const lock = `select pg_advisory_xact_lock(hashtextextended('A:${business}:${phone}',0));`;
  // Both connections contend for the exact same operation; only one is authorized.
  const duplicate = await Promise.all([
    sql(claim("concurrent")),
    sql(claim("concurrent")),
  ]);
  assert.deepEqual(duplicate.sort(), ["f", "t"]);
  // STOP commits while dispatch waits for the same lock. The waiting send must observe suppression.
  const stopper = sql(
    "begin;" + lock + stop("SMstop") + "select pg_sleep(0.5);commit;",
  );
  // The first connection's lock must be observed, not assumed from elapsed time.
  let locked = false;
  for (let n = 0; n < 50; n++) {
    if (
      (await sql(
        "select count(*) from pg_locks where locktype='advisory' and granted;",
      )) !== "0"
    ) {
      locked = true;
      break;
    }
  }
  assert(locked, "STOP lock not observed");
  const waiting = sql(claim("after-stop"));
  await stopper;
  assert.equal(await waiting, "f");
  assert.equal(await sql("select count(*) from isv_sms_suppressions;"), "1");
  assert.equal(
    await sql(
      "select count(*) from isv_sms_audit where event='STOP_SUPPRESSED';",
    ),
    "1",
  );
  assert.equal(await sql(stop("SMstop")), "f");
  // The prior dispatch remains in flight; STOP cannot recall it from the provider.
  assert.equal(
    await sql(
      "select state from isv_sms_dispatches where operation_key='concurrent';",
    ),
    "dispatching",
  );
  assert.equal(await sql(`set role service_role;select isv_record_delivery('A','${assignment}','SMearly','delivered','hash');`),'t');
  const message='00000000-0000-4000-8000-000000000009';
  await sql(`update isv_sms_dispatches set provider_sid='SMearly' where owner_id='A' and operation_key='concurrent';insert into outbound_messages(id,owner_id,provider,provider_message_id) values('${message}','A','twilio','SMearly');`);
  assert.equal(await sql(`set role service_role;select isv_project_delivery('A','${message}');`),'1');
  assert.equal(await sql(`set role service_role;select isv_project_delivery('A','${message}');`),'0');
  assert.equal(await sql(`set role service_role;select isv_project_delivery('B','${message}');`),'0');
  for (const role of ["anon", "authenticated"]) {
    let denied = false;
    try {
      await sql(
        "set role " + role + ";select * from isv_provider_credentials;",
      );
    } catch {
      denied = true;
    }
    assert(denied);
  }
  console.log(
    JSON.stringify({
      result: "PASS",
      engine: "PostgreSQL multi-backend",
      assertions: [
        "migration rollback",
        "one concurrent claim",
        "STOP wins waiting dispatch",
        "durable suppression",
        "webhook replay",
        "in-flight boundary",
        "client role denial",
        "early callback projection",
      ],
    }),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
