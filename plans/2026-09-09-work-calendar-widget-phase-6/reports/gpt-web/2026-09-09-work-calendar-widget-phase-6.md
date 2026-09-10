# Phase 6 final implementation report — external calendar synchronization

Run ID: `2026-09-09-work-calendar-widget-phase-6`

Branch: `feat/work-widget-phase-6`

Status: **SOURCE COMPLETE — READY FOR ORCHESTRATOR VERIFICATION**

One mechanical repository step remains outside this GitHub-only seat: regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only` so the `apps/work-api` importer records the new existing-workspace dependency `@workos-inc/node@10.10.0`. The Work API package manifest has been restored to its previous dev-tool contract. No executable verification is claimed in this report.

## What Phase 6 delivers

Phase 6 turns the provider-neutral Work synchronization seam into a real external-calendar integration plane for Google Calendar, Microsoft Graph Calendar, and CalDAV. Work remains the canonical owner of local calendars/events. Provider-specific authorization, credentials, cursors, transport, conflict handling, and scheduler behavior stay inside `apps/work-api`; browsers only use Invoice-owned same-origin routes.

Implemented surfaces include:

- Google OAuth/token refresh, calendar discovery, paginated incremental event pull, create/update/delete, and HTTP 410 cursor recovery.
- Microsoft OAuth/token refresh, typed paginated calendar discovery, calendar-view delta synchronization, opaque continuation/delta-link validation, and rolling window reset.
- CalDAV Basic-auth credential handling, principal/home discovery, collection discovery, privilege/read-only detection, collection sync-token pull/full fallback, and event PUT/DELETE.
- Work-owned sealed credential persistence with an opaque `credentialRef`; OAuth refresh tokens and CalDAV username/password material are sealed before persistence.
- Per-calendar synchronization cursor/window/error state and child EVENT mappings under CALENDAR mappings.
- Manual per-connection and per-calendar synchronization plus scheduler-tier active-connection synchronization.
- DB-backed connection leases with compare-and-set acquisition, heartbeat, expiration, and token-bound release.
- Atomic remote-calendar linking: new local calendar, owner subscription, and root calendar mapping are created in one Prisma transaction; existing local calendars can be linked explicitly.
- Explicit `PULL_ONLY` mappings for provider read-only calendars.
- Session-tier Work SDK commands for setup, authorization, remote calendar discovery, linking/unlinking, and synchronization.
- Invoice same-origin `/api/calendar-sync/...` BFF routes that authorize the signed-in user and return a browser-safe connection projection.
- `@876/work/browser` same-origin calendar-sync client methods.
- Controlled `@876/work-ui/calendar-sync` presentation and Work widget Manage integration.
- OAuth popup + bounded connection polling; provider tokens never enter the widget.

## Review findings resolved

### CalDAV SSRF / credential exfiltration

The permissive CalDAV URL path was replaced with an outbound network policy that:

- requires HTTPS;
- rejects embedded URL credentials;
- rejects localhost, loopback, RFC1918/private, carrier-grade NAT, link-local, documentation/benchmark/reserved IPv4 and unsafe IPv6 ranges;
- resolves hostnames before connection and rejects the entire DNS answer set if any address is unsafe;
- pins the HTTPS socket to the validated IP while preserving the original Host/SNI identity, closing the validate-then-resolve DNS-rebinding gap;
- does not automatically follow redirects, so Basic credentials are not forwarded to a redirected origin;
- keeps CalDAV discovery hrefs on the configured origin;
- supports exact-origin deployment allowlisting through `WORK_CALDAV_ALLOWED_ORIGINS` and fails closed for malformed policy configuration.

### Synchronization concurrency

The prior process-local serialization concern is replaced by a database-backed lease on `WorkSyncConnection`. Manual connection sync, per-calendar sync, and scheduler-triggered connection sync all compete for the same connection lease. A second runner receives `work/sync-already-running` and does not enter provider work.

### Provider read-only calendars

Google `accessRole`, Microsoft `canEdit`, and CalDAV DAV privilege discovery feed one normalized `readOnly` flag. Linking a read-only provider calendar persists a `PULL_ONLY` root mapping. Pull-only mappings never write or recreate provider events.

During closeout an additional pull-only defect was found: a local edit could survive indefinitely when the provider event itself had not changed since the last sync. Conflict resolution was extracted and corrected so pull-only mappings always converge local drift back to provider state.

### N+1 synchronization path

Calendar reconciliation now loads the local calendar event set and child event mappings in batches, indexes them by local/remote ID, and performs convergence from those maps instead of doing one mapping lookup and one local event lookup for each provider change.

### Atomic linking

Local calendar creation, owner subscription creation, and CALENDAR mapping creation now run in one Prisma transaction. If mapping creation fails, the local calendar/subscription are rolled back. Concurrent unique conflicts are recovered after the transaction rather than leaving orphan calendars.

### Orchestration structure

Provider-neutral conflict policy and provider pull/cursor recovery are extracted into separately testable units (`sync-convergence.ts` and `sync-pull.ts`). Lease management is separate from connection orchestration, and provider transport/normalization remains behind provider adapters.

### Microsoft TypeScript blocker

Microsoft calendar and delta pagination use explicit page response types (`GraphCalendarPage`, `GraphDeltaPage`) and validated same-origin Graph continuation links instead of the inference path that produced `TS7022` in the review snapshot. This source fix still requires local `typecheck` verification.

### Package manifest regression

The branch had accidentally removed existing Work API dev tools while adding Vault support. The manifest now restores:

- `@types/express@5.0.6`;
- `@types/supertest@7.2.1`;
- `tsup@8.5.1`.

`@workos-inc/node@10.10.0` remains a direct Work API dependency because the service owns its WorkOS Vault client. The package/version already exists elsewhere in the workspace lockfile; only the Work API importer needs mechanical lockfile regeneration.

### Widget permission mismatch found during final audit

Provider write routes require `calendars.edit`, but the first widget integration exposed connection mutation controls to users with `calendars.create` alone. The Manage integration now uses `canEditCalendars` specifically for connect/authorize/link/unlink/sync/disconnect controls while ordinary local calendar creation remains available to `calendars.create` users.

## Credential and browser boundary

Raw provider credentials are not returned in browser connection summaries. Invoice serializes `WorkSyncConnection` into `WorkSyncConnectionSummary`, excluding `credentialRef`, `remoteAccountId`, `syncCursor`, OAuth state, lease data, and sealed credential storage metadata.

CalDAV password material crosses the browser boundary only as the user-entered body of the authorized same-origin setup command. Work immediately seals the username/password pair and persists only sealed material plus an opaque credential reference. OAuth refresh tokens are handled only at the Work provider boundary. Provider client secrets remain server environment configuration.

OAuth state is generated server-side, stores only a SHA-256 hash of the random nonce, expires after ten minutes, is bound to connection/provider, and is consumed atomically before code exchange. Replay, expiry, or provider mismatch is rejected before provider token exchange.

## Focused Phase 6 regression inventory

Phase 6 now contains **80 focused `it()` cases in source** across the new/hardened surfaces. These cases were counted from the test source; they were **not executed by GPT Web**.

| Area | File | `it()` cases |
| --- | --- | ---: |
| OAuth/account/link ownership | `sync-account.service.test.ts` | 7 |
| Conflict/idempotency/read-only decisions | `sync-convergence.test.ts` | 9 |
| Credential sealing/resolution | `sync-credentials.test.ts` | 5 |
| DB lease/concurrent runner behavior | `sync-lease.service.test.ts` | 5 |
| Cursor recovery/window rollover | `sync-pull.test.ts` | 4 |
| Connection/calendar orchestration | `sync-run.service.test.ts` | 5 |
| CalDAV outbound network policy | `caldav-network.test.ts` | 15 |
| CalDAV adapter behavior | `caldav.test.ts` | 7 |
| Google/Microsoft provider adapters | `google-microsoft.test.ts` | 6 |
| Browser calendar-sync client | `browser-calendar-sync.test.ts` | 8 |
| Invoice connection BFF authority/projection | `connections/route.test.ts` | 6 |
| Widget Manage provider integration | `work-widget-manage.browser.test.tsx` | 3 |
| **Total** |  | **80** |

Coverage specifically includes provider pagination, stale cursors, Microsoft delta links, CalDAV unsafe-address/DNS policy, read-only mappings, OAuth replay/expiry, cross-user ownership rejection, connection leases, multi-calendar isolation, provider/local conflict decisions, remote deletion recreation rules, browser authority rejection, safe connection projection, provider failure isolation, and calendar-sync permission gating.

## Final adversarial review

The closeout diff was reviewed for the plan's required failure classes:

- **Provider secret leakage:** browser summaries omit credential/account/cursor fields; shared UI receives no provider tokens or internal Work service origins.
- **Unsafe URL handling:** CalDAV uses the dedicated pinned outbound policy; Graph continuation links are constrained to `https://graph.microsoft.com/v1.0/...`; OAuth authorization URLs are produced by server provider helpers.
- **Duplicate OAuth/state helpers:** state generation/consumption remains centralized in sync account/repository code.
- **Swallowed failures:** provider failures map to stable Work error codes; synchronization records connection/mapping health rather than destroying prior synchronized data.
- **Stale connection cursors:** active provider cursors live on root CALENDAR mappings; legacy connection `syncCursor` remains compatibility state only.
- **Host/provider ownership leaks:** Invoice owns browser authorization and same-origin routing; Work API owns provider logic and session ownership; `@876/work-ui` remains transport-free.
- **Read-only write leakage:** `PULL_ONLY` disables provider push/remove/recreate paths and repairs local drift from remote state.
- **Permission drift:** provider mutation UI is aligned to the same `calendars.edit` permission enforced by Invoice routes.

## Remaining orchestrator gate

The source implementation and documentation are complete. Before merge/deployment, the local orchestrator must perform the mechanical lockfile refresh and execute verification. Start with:

```bash
pnpm install --lockfile-only
```

Review that lockfile change carefully: the expected Phase 6-specific importer change is `apps/work-api.dependencies['@workos-inc/node'] = 10.10.0`; avoid accepting unrelated dependency churn.

Then run:

```bash
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/work-api build
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/widgets test:browser
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm check:service-bundle
pnpm check:transpile
```

Database-capable verification must deploy/apply the Phase 6 migrations and confirm the sync-schema invariants before any real Google/Microsoft authorization or CalDAV credential is used:

- `20260909230000_work_external_calendar_sync`
- `20260910003000_work_sync_hardening`

Provider environment configuration must also be reviewed before live use, including Google/Microsoft OAuth credentials and redirect configuration, Work secure-field/Vault configuration, and any `WORK_CALDAV_ALLOWED_ORIGINS` production restriction.

## Verification truth

GPT Web did **not** run pnpm install, typecheck, lint, unit/browser tests, builds, Prisma generation, migrations, database invariant checks, or real provider authorization. The previously supplied local review snapshot remains historical evidence only; it does not validate the final branch state after these fixes.

No pull request was opened or merged in this run.
