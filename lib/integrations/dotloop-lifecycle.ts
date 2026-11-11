/** Dependency-injected service: tests exercise concurrency without provider credentials. */
export type DotloopRecord = {
  owner_id: string; provider: "dotloop"; account_label: string | null;
  expires_at: string | null; updated_at: string; credential_version: number;
  connection_state: "active" | "reconnect_required" | "disconnecting" | "revocation_pending";
  access_token_ciphertext: string | null; refresh_token_ciphertext: string | null;
  operation_kind?: "refresh" | "revoke" | null; operation_until?: string | null;
};
export type DotloopTokens = { access_token: string; refresh_token?: string; expires_in: number; scope: string[] };
export class DotloopError extends Error {
  constructor(public code: string, public status = 503) { super(code); }
}
export type DotloopDependencies = {
  read(owner: string): Promise<DotloopRecord | null>;
  claim(owner: string, lease: string, operation: "refresh" | "revoke"): Promise<DotloopRecord | null>;
  finish(owner: string, lease: string, version: number, operation: "refresh" | "revoke", state: string,
    tokens?: { access: string; refresh: string | null; expiresAt: string; scopes: string[] }): Promise<boolean>;
  encrypt(owner: string, kind: "access" | "refresh", value: string): string;
  decrypt(owner: string, kind: "access" | "refresh", value: string): string;
  refresh(token: string): Promise<DotloopTokens>;
  revoke(token: string): Promise<void>;
  uuid(): string;
  now(): number;
};
export function dotloopStatus(row: DotloopRecord | null, configured: boolean) {
  if (!row) return { configured, connected: false, state: "disconnected", accountLabel: null, lastUpdated: null };
  const encrypted = !!row.access_token_ciphertext;
  const expiry = row.expires_at ? Date.parse(row.expires_at) : NaN;
  const state = !configured ? "configuration_required" : !encrypted ? "reconnect_required" : row.connection_state !== "active"
    ? row.connection_state : row.operation_kind ? row.operation_until && Date.parse(row.operation_until) > Date.now() ? "operation_in_progress" : "reconnect_required" : !Number.isFinite(expiry) || expiry <= Date.now() + 60000
      ? row.refresh_token_ciphertext ? "refresh_required" : "reconnect_required" : "authorization_saved";
  return { configured, connected: configured && row.connection_state === "active" && !row.operation_kind && encrypted && Number.isFinite(expiry) && expiry > Date.now() + 60000,
    state, accountLabel: row.account_label, lastUpdated: row.updated_at };
}
export function createDotloopLifecycle(d: DotloopDependencies) {
  return {
    async accessToken(owner: string): Promise<string> {
      const row = await d.read(owner);
      if (!row || row.owner_id !== owner || row.connection_state !== "active" || !row.access_token_ciphertext)
        throw new DotloopError("dotloop_reconnect_required", 409);
      if (row.operation_kind) throw new DotloopError("dotloop_operation_busy", 409);
      if (row.expires_at && Date.parse(row.expires_at) > d.now() + 60000)
        return d.decrypt(owner, "access", row.access_token_ciphertext);
      if (!row.refresh_token_ciphertext) throw new DotloopError("dotloop_reconnect_required", 409);
      const lease = d.uuid(), claimed = await d.claim(owner, lease, "refresh");
      if (!claimed || claimed.owner_id !== owner) throw new DotloopError("dotloop_operation_busy", 409);
      try {
        if (!claimed.refresh_token_ciphertext) throw Error();
        const tokens = await d.refresh(d.decrypt(owner, "refresh", claimed.refresh_token_ciphertext));
        const ok = await d.finish(owner, lease, claimed.credential_version, "refresh", "active", {
          access: d.encrypt(owner, "access", tokens.access_token),
          refresh: tokens.refresh_token ? d.encrypt(owner, "refresh", tokens.refresh_token) : claimed.refresh_token_ciphertext,
          expiresAt: new Date(d.now() + tokens.expires_in * 1000).toISOString(), scopes: tokens.scope,
        });
        if (!ok) throw Error();
        return tokens.access_token;
      } catch {
        // A timed-out refresh may have reached Dotloop. Never replay an uncertain refresh automatically.
        await d.finish(owner, lease, claimed.credential_version, "refresh", "reconnect_required");
        throw new DotloopError("dotloop_reconnect_required", 409);
      }
    },
    async disconnect(owner: string): Promise<{ revoked: boolean; pending: boolean }> {
      const row = await d.read(owner);
      if (!row) return { revoked: true, pending: false };
      if (row.owner_id !== owner) throw new DotloopError("dotloop_not_found", 404);
      const lease = d.uuid(), claimed = await d.claim(owner, lease, "revoke");
      if (!claimed || claimed.owner_id !== owner) throw new DotloopError("dotloop_operation_busy", 409);
      try {
        if (!claimed.access_token_ciphertext) throw Error();
        await d.revoke(d.decrypt(owner, "access", claimed.access_token_ciphertext));
      } catch {
        if (!(await d.finish(owner, lease, claimed.credential_version, "revoke", "revocation_pending")))
          throw new DotloopError("dotloop_operation_conflict", 409);
        return { revoked: false, pending: true };
      }
      if (!(await d.finish(owner, lease, claimed.credential_version, "revoke", "revoked")))
        throw new DotloopError("dotloop_operation_conflict", 409);
      return { revoked: true, pending: false };
    },
  };
}
