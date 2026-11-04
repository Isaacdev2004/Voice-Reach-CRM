import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { diagnosticsEnabled, expectedPreviewHost, authorizedDeveloper, authenticationCategory, developmentKeys } from '../lib/auth-diagnostics.ts';

test('diagnostics require explicit preview opt in', () => {
  for (const VERCEL_ENV of [undefined, 'production', 'development']) {
    assert.equal(diagnosticsEnabled({ VERCEL_ENV, AUTH_DIAGNOSTICS_ENABLED: 'true' }), false);
  }
  assert.equal(diagnosticsEnabled({ VERCEL_ENV: 'preview' }), false);
  assert.equal(diagnosticsEnabled({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true' }), true);
});
test('host must exactly match configured deployment hostname', () => {
  const env = { AUTH_DIAGNOSTICS_PREVIEW_HOST: 'example.vercel.app', VERCEL_URL: 'example.vercel.app' };
  assert.equal(expectedPreviewHost('example.vercel.app', env), true);
  for (const host of ['evil.example', 'example.vercel.app.evil', '']) assert.equal(expectedPreviewHost(host, env), false);
  assert.equal(expectedPreviewHost('example.vercel.app', { ...env, VERCEL_URL: 'other.vercel.app' }), false);
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
  const base = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: 'preview.vercel.app', VERCEL_URL: 'preview.vercel.app', AUTH_DIAGNOSTICS_DEVELOPER_IDS: 'developer', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_' + Buffer.from('test-instance.clerk.accounts.dev$').toString('base64') };
  async function run(env, userId, hostname = 'preview.vercel.app', throws = false, probeFailure = '', stateOverride = null) {
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
  for (const patch of [{ NEXT_PUBLIC_SUPABASE_URL: 'production' }, { STRIPE_SECRET_KEY: 'private' }, { CRON_SECRET: 'private' }, { ALLOW_LIVE_OUTBOUND: undefined }, { CONCIERGE_ENABLED: 'true' }, { CLERK_SECRET_KEY: 'sk_live_unit' }, { SUPABASE_SERVICE_ROLE_KEY: undefined }]) {
    assert.ok(Object.values(previewSafety({ ...safe, ...patch })).some(value => !value));
  }
});

test('Preview runtime logging records categories for rejected sessions without changing Clerk responses', async () => {
  const { observeClerkMiddleware } = await import('../lib/auth-runtime-diagnostics.ts');
  const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: 'preview.vercel.app', VERCEL_URL: 'preview.vercel.app', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_unit', CLERK_SECRET_KEY: 'sk_test_unit' };
  const logs = [];
  const response = { status: 307, headers: new Headers({ 'x-clerk-auth-status': 'signed-out', 'x-clerk-auth-reason': 'unexpected-error', location: '/sign-in' }) };
  const initialize = async () => async () => response;
  assert.equal(await observeClerkMiddleware(env, 'preview.vercel.app', '/dashboard', initialize, c => logs.push(c)), response);
  assert.deepEqual(logs, ['unexpected_error']);
  assert.equal(response.status, 307); assert.equal(response.headers.get('location'), '/sign-in');
  for (const patch of [{ VERCEL_ENV: 'production' }, { AUTH_DIAGNOSTICS_ENABLED: undefined }, { VERCEL_GIT_COMMIT_REF: 'main' }, { VERCEL_GIT_COMMIT_REF: 'feat/property-interest-mvp' }]) {
    const silent = [];
    assert.equal(await observeClerkMiddleware({ ...env, ...patch }, 'preview.vercel.app', '/dashboard', initialize, c => silent.push(c)), response);
    assert.deepEqual(silent, []);
  }
  for (const [host, path] of [['evil.example', '/dashboard'], ['preview.vercel.app', '/api/internal/auth-diagnostics'], ['preview.vercel.app', '/property-interest']]) {
    const silent = [];
    await observeClerkMiddleware(env, host, path, initialize, c => silent.push(c));
    assert.deepEqual(silent, []);
  }
  for (const [reason, category] of [['token-invalid-signature', 'signature'], ['token-expired', 'clock'], ['private-cookie-jwt-password', 'unknown']]) {
    const recorded = [];
    await observeClerkMiddleware(env, 'preview.vercel.app', '/dashboard', async () => async () => ({ headers: new Headers({ 'x-clerk-auth-reason': reason }) }), c => recorded.push(c));
    assert.deepEqual(recorded, [category]);
  }
  for (const stage of ['initialization', 'execution']) {
    const failure = new Error('private-cookie-jwt-password'); const recorded = [];
    const init = async () => { if (stage === 'initialization') throw failure; return async () => { throw failure; }; };
    await assert.rejects(observeClerkMiddleware(env, 'preview.vercel.app', '/dashboard', init, c => recorded.push(c)), error => error === failure);
    assert.deepEqual(recorded, [`middleware_${stage}`]);
  }
  // The log sink failing cannot change redirects or make a denied request succeed.
  assert.equal(await observeClerkMiddleware(env, 'preview.vercel.app', '/dashboard', initialize, () => { throw Error('sink'); }), response);
});

test('proxy retains dashboard protection, original request context, header sanitization and scheduler isolation', async () => {
  const ts = await import('typescript'); const vm = await import('node:vm');
  const runtime = await import('../lib/auth-runtime-diagnostics.ts');
  const js = ts.default.transpileModule(fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.default.ModuleKind.CommonJS } }).outputText;
  const base = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'test/property-interest-clerk-request-context', AUTH_DIAGNOSTICS_ENABLED: 'true', AUTH_DIAGNOSTICS_PREVIEW_HOST: 'preview.vercel.app', VERCEL_URL: 'preview.vercel.app', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_unit', CLERK_SECRET_KEY: 'sk_test_unit' };
  async function run(path, env = base) {
    const exports = {}; let protectCalls = 0; let sdkCalls = 0; let originalRequest = null; const logs = [];
    const request = { nextUrl: { hostname: 'preview.vercel.app', pathname: path }, headers: new Headers({ 'x-myari-property-introduction': 'forged', 'x-clerk-auth-reason': 'private-forged' }) };
    const denied = { status: 307, headers: new Headers({ location: '/sign-in', 'x-clerk-auth-status': 'signed-out', 'x-clerk-auth-reason': 'unexpected-error' }) };
    vm.runInNewContext(js, { exports, Headers, process: { env }, console: { info: value => logs.push(value) }, require(name) {
      if (name === '@/lib/auth-runtime-diagnostics') return runtime;
      if (name === '@/lib/clerk-env') return { hasClerkEnv: () => true };
      if (name === '@/lib/seo/site') return { PUBLIC_ROUTE_PATTERNS: ['/'] };
      if (name === 'next/server') return { NextResponse: {
        next: options => ({ status: 200, headers: new Headers(), forwarded: options?.request?.headers }),
        json: (body, options) => ({ body, status: options.status, headers: new Headers() }),
      } };
      if (name === '@clerk/nextjs/server') return {
        createRouteMatcher: patterns => req => patterns.includes('/api/(.*)') ? req.nextUrl.pathname.startsWith('/api/') : req.nextUrl.pathname === '/',
        clerkMiddleware: callback => async req => { sdkCalls++; originalRequest = req; try { return await callback({ protect: async () => { protectCalls++; throw denied; } }, req); } catch (error) { if (error === denied) return denied; throw error; } },
      };
      throw Error('Unexpected dependency');
    } });
    const result = await exports.default(request, {});
    return { result, request, originalRequest, protectCalls, sdkCalls, logs };
  }
  const dashboard = await run('/dashboard');
  assert.equal(dashboard.protectCalls, 1); assert.equal(dashboard.result.status, 307);
  assert.equal(dashboard.originalRequest, dashboard.request);
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
  const publicPage = await run('/property-interest');
  assert.equal(publicPage.sdkCalls, 0); assert.deepEqual(publicPage.logs, []);
});
