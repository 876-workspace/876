# Phase 6 tracker — external calendar synchronization

Branch: `feat/work-widget-phase-6`

Baseline tree: `58599a9fc2e112e47ee5d5972177403469b46b53`

Status: `COMPLETE; LOCALLY_VERIFIED; PR_READY`

**New-session entry point:** read [`review-handoff.md`](./review-handoff.md) for the original local-review findings, then this tracker and the [final GPT Web report](./reports/gpt-web/2026-09-09-work-calendar-widget-phase-6.md) for their resolution and final verification results.

## Baseline review

- [x] Confirm Phase 6 branch is tree-identical to the validated Phase 5 merge baseline at phase start.
- [x] Read root `CLAUDE.md` and GPT-Web standing rules.
- [x] Read backend, SDK, access-tier, naming, type, code-style, testing, and error-handling rules relevant to provider work.
- [x] Confirm Work already owns `WorkSyncConnection`, `WorkSyncMapping`, provider-neutral adapter interfaces, calendars, events, participants, and recurrence.
- [x] Confirm Phase 2 intentionally deferred real Google/Microsoft/CalDAV HTTP/OAuth implementations.
- [x] Verify provider incremental-sync semantics used by the Phase 6 design.
- [x] Move active cursor state to CALENDAR mappings because provider cursors are calendar/collection scoped.

## 6A — persistence / credentials

- [x] Schema and additive migrations.
- [x] Secure-field binding.
- [x] WorkOS Vault/local secure-field provider binding with fail-closed behavior.
- [x] Credential repository/resolver.
- [x] Mapping-level cursor/window/error state.
- [x] Scope event mappings beneath calendar mappings so remote IDs are calendar-local.
- [x] Credential sealing/resolution tests.

## 6B — providers

- [x] Google OAuth/token refresh + Calendar adapter.
- [x] Microsoft OAuth/token refresh + Graph Calendar adapter.
- [x] CalDAV discovery + synchronization adapter.
- [x] Shared normalized provider contracts/errors.
- [x] Deterministic provider adapter tests with mocked/injected transport.
- [x] Google/Microsoft pagination and cursor/delta regressions.
- [x] CalDAV privilege/read-only discovery and cursor regressions.
- [x] CalDAV outbound network/SSRF policy regressions.

## 6C — authorization / linking

- [x] OAuth authorize/state/callback lifecycle.
- [x] CalDAV credential setup.
- [x] Single-use hashed OAuth state with expiration and provider binding.
- [x] Account metadata resolution with safe metadata only.
- [x] Remote-calendar discovery.
- [x] Calendar link/import/unlink lifecycle.
- [x] HTTP routes/controllers and callback surface.
- [x] `@876/work` session resource methods.
- [x] Invoice same-origin BFF with browser-safe connection projection.
- [x] Ownership/authority regressions.
- [x] OAuth replay/expiry regressions.
- [x] Make local-calendar + owner-subscription + calendar-mapping creation atomic.
- [x] Persist/enforce remote read-only calendars as `PULL_ONLY` mappings.

## 6D — synchronization

- [x] Manual connection/calendar sync service.
- [x] Scheduler batch sync service.
- [x] Remote → Work convergence.
- [x] Work → provider convergence for supported non-recurring event shapes.
- [x] Google/CalDAV cursor invalidation fallback and Microsoft window rollover.
- [x] Health/error state updates without destroying previous synchronized data.
- [x] Remote-deletion/local-change recreation reuses the existing event mapping.
- [x] Exact connection lookup is tenant-aware/direct rather than batch-scanned.
- [x] Database compare-and-set/lease protection serializes manual, calendar, and scheduler sync per connection.
- [x] Batch event/mapping retrieval removes the per-change sync N+1 lookup path.
- [x] Extract provider-neutral convergence/conflict logic into `sync-convergence.ts`.
- [x] Extract provider pull/cursor/window recovery into `sync-pull.ts`.
- [x] Fix pull-only local drift so provider state remains the source of truth even when the remote event did not change.
- [x] Sync regressions: idempotency, concurrency, conflict resolution, deletion/recreation, cursor recovery, multi-calendar isolation, and health propagation.

## 6E — browser/widget pilot

- [x] Invoice BFF.
- [x] `@876/work/browser` safe calendar-sync methods.
- [x] Controlled `@876/work-ui/calendar-sync` UI.
- [x] Widget Manage integration.
- [x] OAuth popup + safe connection-state polling.
- [x] Browser/component regressions.
- [x] Keep ordinary Work Manage rendering available when provider management fails.
- [x] Align provider write controls to `calendars.edit` rather than `calendars.create || calendars.edit`.

## Local AI review — 2026-09-09 resolution

The original review findings remain documented in [`review-handoff.md`](./review-handoff.md). Their current status is:

- [x] **Blocker — lockfile:** regenerated locally; the only change adds `@workos-inc/node@10.10.0` to the Work API importer, and `pnpm install --frozen-lockfile` passes.
- [x] **Blocker — TypeScript source:** Microsoft paginated calendar/delta responses now use explicit `GraphCalendarPage`/`GraphDeltaPage` types and validated continuation links, removing the reviewed TS7022 inference path; the final Work API typecheck passes.
- [x] **Blocker — SSRF:** CalDAV now requires HTTPS, rejects unsafe/private/reserved destinations, validates every DNS answer, pins TLS to the validated IP, preserves Host/SNI, forbids automatic redirects, keeps discovery same-origin, and supports exact-origin allowlisting.
- [x] **High — concurrency:** DB-backed connection lease/CAS with heartbeat and token-bound release covers manual, per-calendar, and scheduler sync.
- [x] **High — read-only calendars:** normalized remote `readOnly` becomes `PULL_ONLY`; provider writes/recreates are disabled and local drift is repaired from provider state.
- [x] **High — N+1 / timeout:** local calendar events and child event mappings are batch-loaded/indexed before convergence.
- [x] **Medium — atomic linking:** new calendar, owner subscription, and root mapping are one Prisma transaction; concurrent unique conflicts recover after rollback.
- [x] **Medium — structure:** conflict decisions, cursor/window recovery, leases, provider adapters, and run orchestration are split into distinct testable units.

### Historical local verification snapshot supplied in the review handoff

- Existing `@876/work` tests at that snapshot: **243 passed**.
- Existing Work API tests at that snapshot: **575 passed**.
- `@876/work` compiled at that snapshot.
- Work API did **not** compile then because of Microsoft TS7022.
- pnpm verification was blocked then by `ERR_PNPM_OUTDATED_LOCKFILE`.

These numbers are historical only. They do not verify the final branch after the subsequent Phase 6 fixes.

## 6F — closeout

- [x] Resolve every local-review blocker and complete local verification.
- [x] Diff/adversarial review completed for secret leakage, outbound URL policy, OAuth state ownership, cursor ownership, read-only writes, swallowed provider failures, host/service boundaries, and browser permissions.
- [x] Focused final Phase 6 test-case count: **82 `it()` cases in source**.
- [x] Final report written at `reports/gpt-web/2026-09-09-work-calendar-widget-phase-6.md` under this plan directory.
- [x] Orchestrator verification handoff documented with exact commands and migration requirements.

## Remaining deployment actions

1. Apply/validate `20260909230000_work_external_calendar_sync` and `20260910003000_work_sync_hardening` against the deployment database.
2. Test real Google/Microsoft OAuth and approved CalDAV origins with deployment secrets/configuration.

## Notes

- GPT Web did **not** execute pnpm install, typecheck, lint, tests, browser tests, builds, Prisma generation, migrations, schema checks, or real provider authorization.
- The final pull request is authorized after local verification and branch synchronization with `main`.
- Raw provider tokens/passwords must never enter browser responses, ordinary Work resource serializers, logs, or `credentialRef`.
- Existing connection `syncCursor` is compatibility state; active Phase 6 provider cursors live on root CALENDAR mappings.
- Phase 6 is source-complete, locally verified, and ready for pull-request review.
