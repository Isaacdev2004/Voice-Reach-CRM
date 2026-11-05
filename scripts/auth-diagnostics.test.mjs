import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isClerkKeyValue, getClerkPublishableKey, getClerkSecretKey } from '../lib/clerk-env.ts';
import { diagnosticsEnabled, expectedPreviewHost, authorizedDeveloper, authenticationCategory, developmentKeys } from '../lib/auth-diagnostics.ts';

const APPROVED_HOST = 'myari-clerk-auth-isolate-git-00383f-magnificent-soless-projects.vercel.app';

test('diagnostics require explicit preview opt in', () => {
  for (const VERCEL_ENV of [undefined, 'production', 'development']) {
    assert.equal(diagnosticsEnabled({ VERCEL_ENV, AUTH_DIAGNOSTICS_ENABLED: 'true' }), false);
  }
  assert.equal(diagnosticsEnabled({ VERCEL_ENV: 'preview' }), false);
  assert.equal(diagnosticsEnabled({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true' }), true);
});
test('host must exactly match approved Vercel branch alias across deployments', () => {
  const env = { AUTH_DIAGNOSTICS_PREVIEW_HOST: APPROVED_HOST, VERCEL_BRANCH_URL: APPROVED_HOST, VERCEL_URL: 'deployment-one.vercel.app' };
  assert.equal(expectedPreviewHost(APPROVED_HOST, env), true);
  for (const host of ['evil.example', `${APPROVED_HOST}.evil`, 'myari-clerk-auth-isolated-qa.vercel.app', 'myari-clerk-auth-isolate-git-other-magnificent-soless-projects.vercel.app', '']) assert.equal(expectedPreviewHost(host, env), false);
  assert.equal(expectedPreviewHost(APPROVED_HOST, { ...env, VERCEL_URL: 'deployment-two.vercel.app' }), true);
  assert.equal(expectedPreviewHost(APPROVED_HOST, { ...env, VERCEL_BRANCH_URL: 'other.vercel.app' }), false);
  assert.equal(expectedPreviewHost(APPROVED_HOST, { ...env, VERCEL_BRANCH_URL: undefined }), false);
  assert.equal(expectedPreviewHost('deployment-one.vercel.app', env), false);
  assert.equal(expectedPreviewHost('other-project.vercel.app', { AUTH_DIAGNOSTICS_PREVIEW_HOST: 'other-project.vercel.app', VERCEL_BRANCH_URL: 'other-project.vercel.app' }), false);
  for (const expected of ['', '*.vercel.app', 'https://example.vercel.app', 'example.vercel.app/path']) {
    assert.equal(expectedPreviewHost(APPROVED_HOST, { ...env, AUTH_DIAGNOSTICS_PREVIEW_HOST: expected }), false);
  }
});
test('only explicitly authorized authenticated developers qualify', () => {
  const env = { AUTH_DIAGNOSTICS_DEVELOPER_IDS: 'user_one, user_two' };
  for (const id of [null, '', 'user', 'user_three']) assert.equal(authorizedDeveloper(id, env), false);
  assert.equal(authorizedDeveloper('user_two', env), true);
  assert.equal(authorizedDeveloper('user_two', {}), false);
});
test('sanitization never returns unknown input or exception messages', () => {
  for (const value of ['secret cookie value', new Error('private'), undefined, 'unexpected-error']) assert.equal(authenticationCategory(value), 'unknown');
  assert.equal(authenticationCategory('token-invalid-issuer'), 'issuer');
  assert.equal(authenticationCategory('token-invalid-signature'), 'signature');
  assert.equal(authenticationCategory('token-expired'), 'clock');
  assert.deepEqual(developmentKeys({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_example', CLERK_SECRET_KEY: 'sk_test_placeholder' }), { publishableKeyIsDevelopment: false, secretKeyIsDevelopment: false });
});
test('dashboard protection remains enforced; diagnostics collect only after developer gate', () => {
  const proxy = fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
  assert.match(proxy, /await auth\.protect\(\)/);
  const route = fs.readFileSync(new URL('../app/api/internal/auth-diagnostics/route.ts', import.meta.url), 'utf8');
  assert.ok(route.indexOf('if (!authorizedDeveloper') < route.indexOf('sessionCookieExists:'));
  assert.doesNotMatch(route, /console\.|\.message|authorization\b|cookies\.get/);
});

test('route denies disabled, wrong-host, anonymous and nondeveloper requests before SDK probes', async () => {
  const ts = await import('typescript');
  const vm = await import('node:vm');
  const helper = await import('../lib/auth-diagnostics.ts');
  const source = fs.readFileSync(new URL('../app/api/internal/auth-diagnostics/route.ts', import.meta.url), 'utf8');
  const js = ts.default.transpileModule(source, { compilerOptions: { module: ts.default.ModuleKind.CommonJS } }).outputText;
  const base = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: APPROVED_HOST, VERCEL_BRANCH_URL: APPROVED_HOST, VERCEL_URL: 'rotating-deployment.vercel.app', AUTH_DIAGNOSTICS_DEVELOPER_IDS: 'developer', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_' + Buffer.from('test-instance.clerk.accounts.dev$').toString('base64') };
  async function run(env, userId, hostname = APPROVED_HOST, throws = false, probeFailure = '', stateOverride = null) {
    let probes = 0;
    const exports = {};
    vm.runInNewContext(js, { exports, Buffer, process: { env }, require(name) {
      if (name === '@/lib/auth-diagnostics') return helper;
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, ...options }) } };
      if (name === '@clerk/nextjs/server') return {
        auth: async () => { if (throws) throw Error('sensitive'); return { userId }; },
        clerkClient: async () => { probes++; if (probeFailure === 'initialization') throw Error('private-token'); return { authenticateRequest: async () => stateOverride ?? ({ isSignedIn: true, toAuth: () => ({ sessionClaims: { iss: "https://test-instance.clerk.accounts.dev" } }) }), users: { getUser: async () => { if (probeFailure === 'api') throw Error('private-key'); return {}; } } }; },
      };
      throw Error('Unexpected dependency');
    } });
    const result = await exports.GET({ nextUrl: { hostname }, cookies: { has: () => true } });
    return { result, probes };
  }
  for (const [env, id, host, status, throws] of [
    [{ ...base, AUTH_DIAGNOSTICS_ENABLED: undefined }, 'developer', undefined, 404],
    [{ ...base, VERCEL_ENV: 'production' }, 'developer', undefined, 404],
    [{ ...base, VERCEL_GIT_COMMIT_REF: 'main' }, 'developer', undefined, 404],
    [{ ...base, VERCEL_BRANCH_URL: 'other-project.vercel.app' }, 'developer', undefined, 404],
    [base, 'developer', 'evil.example', 404], [base, null, undefined, 401],
    [base, 'other', undefined, 403], [base, null, undefined, 401, true],
  ]) {
    const { result, probes } = await run(env, id, host, throws);
    assert.equal(result.status, status); assert.equal(probes, 0);
    assert.deepEqual(Object.keys(result.body), ['error']);
  }
  const { result, probes } = await run(base, 'developer');
  assert.equal(probes, 1);
  assert.equal(result.headers['Cache-Control'], 'no-store, private');
  assert.equal(result.body.authenticationErrorCategory, 'none');
  for (const [failure, category] of [['initialization', 'sdk_initialization_or_verification'], ['api', 'clerk_api_request_failed']]) {
    const failed = await run(base, 'developer', undefined, false, failure);
    assert.equal(failed.result.body.authenticationErrorCategory, category);
    assert.ok(!JSON.stringify(failed.result.body).includes('private-'));
  }
  for (const [state, category] of [
    [{ isSignedIn: false, reason: 'token-invalid-signature' }, 'signature'],
    [{ isSignedIn: false, reason: 'token-expired' }, 'clock'],
    [{ isSignedIn: false, reason: 'unexpected-error' }, 'unknown'],
    [{ isSignedIn: false, reason: 'private-token' }, 'unknown'],
    [{ isSignedIn: true, toAuth: () => ({ sessionClaims: { iss: 'https://other-instance.clerk.accounts.dev' } }) }, 'issuer'],
  ]) {
    const checked = await run(base, 'developer', undefined, false, '', state);
    assert.equal(checked.result.body.authenticationErrorCategory, category);
    assert.ok(!JSON.stringify(checked.result.body).includes('private-token'));
    assert.ok(!JSON.stringify(checked.result.body).includes('other-instance'));
  }
  assert.deepEqual(Object.keys(result.body).sort(), ['sessionCookieExists', 'authenticatedUser', 'expectedPreviewHostname', 'publishableKeyIsDevelopment', 'secretKeyIsDevelopment', 'authenticationErrorCategory'].sort());
});

test('staging safety fails closed for wrong database, live credentials and unset outbound flag', async () => {
  const { previewSafety } = await import('./auth-diagnostics-safety.mjs');
  const safe = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', NEXT_PUBLIC_SUPABASE_URL: 'https://jojgdfpmaxvbhobjrsbm.supabase.co', ALLOW_LIVE_OUTBOUND: 'false', VOICE_PROVIDER: 'mock', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_unit', CLERK_SECRET_KEY: 'sk_test_unit', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' };
  assert.ok(Object.values(previewSafety(safe)).every(Boolean));
  for (const patch of [{ NEXT_PUBLIC_SUPABASE_URL: 'production' }, { STRIPE_SECRET_KEY: 'private' }, { CRON_SECRET: 'private' }, { ALLOW_LIVE_OUTBOUND: undefined }, { CONCIERGE_ENABLED: 'true' }, { CLERK_SECRET_KEY: 'sk_live_unit' }, { CLERK_SECRET_KEY: 'sk_test_x\u2026' }, { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x\u2026' }, { CLERK_SECRET_KEY: 'sk_test_redacted' }, { CLERK_SECRET_KEY: 'sk_test_x\n' }, { SUPABASE_SERVICE_ROLE_KEY: undefined }]) {
    assert.ok(Object.values(previewSafety({ ...safe, ...patch })).some(value => !value));
  }
});

test('Preview runtime logging records categories for rejected sessions without changing Clerk responses', async () => {
  const { observeClerkMiddleware } = await import('../lib/auth-runtime-diagnostics.ts');
  const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: APPROVED_HOST, VERCEL_BRANCH_URL: APPROVED_HOST, VERCEL_URL: 'rotating-deployment.vercel.app', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_unit', CLERK_SECRET_KEY: 'sk_test_unit' };
  const logs = [];
  const response = { status: 307, headers: new Headers({ 'x-clerk-auth-status': 'signed-out', 'x-clerk-auth-reason': 'unexpected-error', location: '/sign-in' }) };
  const initialize = async () => async () => response;
  assert.equal(await observeClerkMiddleware(env, APPROVED_HOST, '/dashboard', initialize, c => logs.push(c)), response);
  assert.deepEqual(logs, ['unexpected_error']);
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/sign-in');
  for (const patch of [{ VERCEL_BRANCH_URL: 'other-project.vercel.app' }, { VERCEL_BRANCH_URL: undefined }, { VERCEL_ENV: 'production' }, { AUTH_DIAGNOSTICS_ENABLED: undefined }, { VERCEL_GIT_COMMIT_REF: 'main' }, { VERCEL_GIT_COMMIT_REF: 'feat/property-interest-mvp' }]) {
    const silent = [];
    assert.equal(await observeClerkMiddleware({ ...env, ...patch }, APPROVED_HOST, '/dashboard', initialize, c => silent.push(c)), response);
    assert.deepEqual(silent, []);
  }
  for (const [host, path] of [['evil.example', '/dashboard'], ['rotating-deployment.vercel.app', '/dashboard'], [APPROVED_HOST, '/api/internal/auth-diagnostics'], [APPROVED_HOST, '/property-interest']]) {
    const silent = [];
    await observeClerkMiddleware(env, host, path, initialize, c => silent.push(c));
    assert.deepEqual(silent, []);
  }
  for (const [reason, category] of [['token-invalid-signature', 'signature'], ['token-expired', 'clock'], ['private-cookie-jwt-password', 'unknown']]) {
    const recorded = [];
    await observeClerkMiddleware(env, APPROVED_HOST, '/dashboard', async () => async () => ({ headers: new Headers({ 'x-clerk-auth-reason': reason }) }), c => recorded.push(c));
    assert.deepEqual(recorded, [category]);
  }
  for (const stage of ['initialization', 'execution']) {
    const failure = new Error('private-cookie-jwt-password'); const recorded = [];
    const init = async () => { if (stage === 'initialization') throw failure; return async () => { throw failure; }; };
    await assert.rejects(observeClerkMiddleware(env, APPROVED_HOST, '/dashboard', init, c => recorded.push(c)), error => error === failure);
    assert.deepEqual(recorded, [`middleware_${stage}`]);
  }
  // The log sink failing cannot change redirects or make a denied request succeed.
  assert.equal(await observeClerkMiddleware(env, APPROVED_HOST, '/dashboard', initialize, () => { throw Error('sink'); }), response);
});

test('proxy retains dashboard protection, original request context, header sanitization and scheduler isolation', async () => {
  const ts = await import('typescript'); const vm = await import('node:vm');
  const runtime = await import('../lib/auth-runtime-diagnostics.ts');
  const js = ts.default.transpileModule(fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.default.ModuleKind.CommonJS } }).outputText;
  const base = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: APPROVED_HOST, VERCEL_BRANCH_URL: APPROVED_HOST, VERCEL_URL: 'rotating-deployment.vercel.app', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_unit', CLERK_SECRET_KEY: 'sk_test_unit' };
  async function run(path, env = base) {
    const exports = {}; let protectCalls = 0; let sdkCalls = 0; let middlewareCreations = 0; let suppliedOptions = null; let originalRequest = null; const logs = [];
    const request = { nextUrl: { hostname: APPROVED_HOST, pathname: path }, headers: new Headers({ 'x-myari-property-introduction': 'forged', 'x-clerk-auth-reason': 'private-forged' }) };
    const denied = { status: 307, headers: new Headers({ location: '/sign-in', 'x-clerk-auth-status': 'signed-out', 'x-clerk-auth-reason': 'unexpected-error' }) };
    vm.runInNewContext(js, { exports, Headers, process: { env }, console: { info: value => logs.push(value) }, require(name) {
      if (name === '@/lib/auth-runtime-diagnostics') return runtime;
      if (name === '@/lib/clerk-env') return {
        getClerkPublishableKey: () => isClerkKeyValue(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, 'pk_') ? env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY : undefined,
        getClerkSecretKey: () => isClerkKeyValue(env.CLERK_SECRET_KEY, 'sk_') ? env.CLERK_SECRET_KEY : undefined,
      };
      if (name === '@/lib/seo/site') return { PUBLIC_ROUTE_PATTERNS: ['/'] };
      if (name === 'next/server') return { NextResponse: {
        next: options => ({ status: 200, headers: new Headers(), forwarded: options?.request?.headers }),
        json: (body, options) => ({ body, status: options.status, headers: new Headers(options.headers) }),
      } };
      if (name === '@clerk/nextjs/server') return {
        createRouteMatcher: patterns => req => patterns.includes('/api/(.*)') ? req.nextUrl.pathname.startsWith('/api/') : req.nextUrl.pathname === '/',
        clerkMiddleware: (callback, options) => { middlewareCreations++; suppliedOptions = options; return async req => { sdkCalls++; originalRequest = req; try { return await callback({ protect: async () => { protectCalls++; throw denied; } }, req); } catch (error) { if (error === denied) return denied; throw error; } }; },
      };
      throw Error('Unexpected dependency');
    } });
    const result = await exports.default(request, {});
    return { result, request, originalRequest, protectCalls, sdkCalls, middlewareCreations, suppliedOptions, logs };
  }
  const dashboard = await run('/dashboard');
  assert.equal(dashboard.protectCalls, 1); assert.equal(dashboard.result.status, 307);
  assert.equal(dashboard.originalRequest, dashboard.request);
  assert.equal(dashboard.suppliedOptions.publishableKey, base.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  assert.equal(dashboard.suppliedOptions.secretKey, base.CLERK_SECRET_KEY);
  assert.equal(dashboard.suppliedOptions.debug, false);
  assert.deepEqual(dashboard.logs, ['MYARI_AUTH_DIAGNOSTIC:unexpected_error']);
  for (const env of [{ ...base, AUTH_DIAGNOSTICS_ENABLED: undefined }, { ...base, VERCEL_ENV: 'production' }]) {
    const protectedRequest = await run('/dashboard', env);
    assert.equal(protectedRequest.protectCalls, 1); assert.equal(protectedRequest.result.status, 307);
    assert.deepEqual(protectedRequest.logs, []);
  }
  const api = await run('/api/contacts');
  assert.equal(api.protectCalls, 0); assert.equal(api.originalRequest, api.request);
  assert.equal(api.result.forwarded.has('x-myari-property-introduction'), false);
  for (const path of ['/api/campaigns/runner', '/api/dashboard/briefing/runner']) {
    const blocked = await run(path); assert.equal(blocked.result.status, 403); assert.equal(blocked.sdkCalls, 0);
    const production = await run(path, { ...base, VERCEL_ENV: 'production' }); assert.equal(production.sdkCalls, 1);
  }
  for (const patch of [
    { CLERK_SECRET_KEY: 'sk_test_x\u2026' }, { CLERK_SECRET_KEY: 'sk_test_redacted' },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_x\u2026' },
    { CLERK_SECRET_KEY: undefined }, { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined },
  ]) {
    for (const path of ['/dashboard', '/api/contacts', '/api/internal/auth-diagnostics']) {
      const blocked = await run(path, { ...base, ...patch });
      assert.equal(blocked.result.status, 503); assert.equal(blocked.sdkCalls, 0); assert.equal(blocked.middlewareCreations, 0);
      assert.equal(blocked.result.headers.get('location'), null);
      assert.equal(blocked.result.headers.get('cache-control'), 'no-store');
      assert.equal(blocked.result.body.code, 'service_unconfigured');
      assert.deepEqual(blocked.logs, path === '/dashboard' ? ['MYARI_AUTH_DIAGNOSTIC:clerk_configuration'] : []);
    }
    const publicRoot = await run('/', { ...base, ...patch });
    assert.equal(publicRoot.result.status, 200); assert.equal(publicRoot.sdkCalls, 0);
  }
  const publicPage = await run('/property-interest');
  assert.equal(publicPage.sdkCalls, 0); assert.deepEqual(publicPage.logs, []);
});


test('Clerk credentials reject Unicode, controls and redactions without repairing values', t => {
  const names = ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'];
  const previous = names.map(name => process.env[name]);
  t.after(() => names.forEach((name, i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; }));
  for (const suffix of ['x\u2026', 'x...', 'paste_full_key_here', 'placeholder', 'redacted', 'x\u00e9', 'x\u200b', 'x\r\n', 'x\u007f', ' x', 'x ']) {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_' + suffix;
    process.env.CLERK_SECRET_KEY = 'sk_test_' + suffix;
    assert.equal(getClerkPublishableKey(), undefined);
    assert.equal(getClerkSecretKey(), undefined);
    assert.deepEqual(developmentKeys(process.env), { publishableKeyIsDevelopment: false, secretKeyIsDevelopment: false });
  }
  for (const mode of ['test', 'live']) {
    const pk = `pk_${mode}_synthetic`;
    const sk = `sk_${mode}_synthetic`;
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk; process.env.CLERK_SECRET_KEY = sk;
    assert.equal(getClerkPublishableKey(), pk); assert.equal(getClerkSecretKey(), sk);
  }
});

test('installed Clerk handshake client reproduces index-16 ByteString failure before fetch', async t => {
  const previousMode = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  t.after(() => { if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode; });
  let requests = 0;
  const directive = '__session=synthetic-only; Path=/; HttpOnly; Secure; SameSite=Lax';
  t.mock.method(globalThis, 'fetch', async () => {
    requests++;
    return new Response(JSON.stringify({ object: 'handshake_payload', directives: [directive] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const { createClerkClient } = await import('@clerk/backend');
  // Synthetic input only; never use or print a deployed credential in this test.
  const malformed = 'sk_test_x' + String.fromCodePoint(8230);
  await assert.rejects(
    createClerkClient({ secretKey: malformed }).clients.getHandshakePayload({ nonce: 'synthetic-nonce' }),
    error => error instanceof TypeError && /index 16.*8230/.test(error.message),
  );
  assert.equal(requests, 0);
  assert.equal(isClerkKeyValue(malformed, 'sk_'), false);
  const safe = 'sk_test_synthetic_ascii';
  assert.equal(isClerkKeyValue(safe, 'sk_'), true);
  const payload = await createClerkClient({ secretKey: safe }).clients.getHandshakePayload({ nonce: 'synthetic-nonce' });
  assert.equal(requests, 1);
  assert.deepEqual(payload.directives, [directive]);
  assert.doesNotThrow(() => new Headers({ 'Set-Cookie': payload.directives[0] }));
});
