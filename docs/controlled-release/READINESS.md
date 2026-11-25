# Controlled Dotloop reconciliation — November 25, 2026

PR #60 is reconciled with main a79583d without changing Calendar, Assistant, Concierge, current contact quotas or campaign reliability. Configuration examples and test chains preserve newer main additions; automatic deployment remains disabled.

Production read-only catalog check: encrypted token columns and four Dotloop RPCs are absent. The restrictive permissions repair is already live and MUST NOT be repeated. A merge to main automatically deploys code; this version immediately selects the new metadata columns and changes existing connection lifecycle semantics. Merely withholding a UI flag does not make that backward compatible. Therefore no Production merge/deployment is eligible until schema/key/reconnection requirements are resolved; do not silently encrypt, revoke or quarantine existing credentials through deployment.

Exact remaining schema-only artifact is now tracked at docs/dotloop-security/oauth-schema-only.sql, SHA-256 0ca6e4880f39166e38bc671a6b3344946c178cc8161dfb677d3520104a6d6cf8. It asserts the installed permissions baseline, adds encrypted/state/lease fields and four service-only RPCs, and does not backfill tokens on application. The disposable PostgreSQL suite now also exercises these exact bytes over an already repaired baseline. Historical production.sql is NOT the execution artifact for the currently repaired Production database.

Remaining approvals: recent verified completed backup/PITR; exact schema-only Production SQL; secure separate keyring/active-ID configuration; decision on legacy authorization revocation/reconnection; actual test-account OAuth/refresh/reconnect/disconnect/provider-error acceptance. No real credentials were retrieved/decrypted/exported and no provider operation occurred.

Rollback retains restrictive permissions, ciphertext and all referenced key versions. Use reviewed app disablement/forward fixes; never restore plaintext storage or broad client grants. Do not roll back the old token service over ciphertext-only rows. Google uses calendar_connections and remains unchanged.

No Production merge, migration, key configuration, credential rotation or activation is performed by this reconciliation. Required repository reviews/rules remain unverified; do not bypass them.
