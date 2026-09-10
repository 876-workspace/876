# Phase 6 tracker — external calendar synchronization

Branch: `feat/work-widget-phase-6`

Baseline tree: `58599a9fc2e112e47ee5d5972177403469b46b53`

Status: `IN_PROGRESS; LOCAL_REVIEW_BLOCKERS_BEING_RESOLVED`

**New-session entry point:** read [`review-handoff.md`](./review-handoff.md) first. It contains the local orchestrator's blocker/high/medium findings, the verified test snapshot, security requirements, remaining Phase 6 product work, test matrix, and the completion gate. Then read `plan.md` and this tracker before changing source.

## Baseline review

- [x] Confirm Phase 6 branch is tree-identical to the validated Phase 5 merge baseline.
- [x] Read root `CLAUDE.md` and GPT-Web standing rules.
- [x] Read backend, SDK, access-tier, naming, type, code-style, testing, and error-handling rules relevant to provider work.
- [x] Confirm Work already owns `WorkSyncConnection`, `WorkSyncMapping`, provider-neutral adapter interfaces, calendars, events, participants, and recurrence.
- [x] Confirm Phase 2 intentionally deferred real Google/Microsoft/CalDAV HTTP/OAuth implementations.
- [x] Verify current provider incremental-sync semantics from first-party documentation.
- [x] Identify the connection-level cursor mismatch: provider cursors are calendar/collection scoped.

## 6A — persistence / credentials

- [x] Schema and migration.
- [x] Secure-field binding.
- [x] Credential repository/resolver.
- [x] Mapping-level cursor state.
- [x] Scope event mappings beneath calendar mappings so remote IDs are calendar-local.
- [x] Credential sealing tests added.

## 6B — providers

- [x] Google OAuth/token refresh + Calendar adapter drafted.
- [x] Microsoft OAuth/token refresh + Graph Calendar adapter drafted.
- [x] CalDAV discovery + synchronization adapter drafted.
- [x] Shared normalized provider contracts/errors drafted.
- [ ] Deterministic provider adapter tests with mocked transport.

## 6C — authorization / linking

- [x] OAuth authorize/state/callback service lifecycle drafted.
- [x] CalDAV credential setup drafted.
- [x] Account metadata resolution drafted.
- [x] Remote-calendar discovery drafted.
- [x] Calendar link/import/unlink service lifecycle drafted.
- [x] HTTP routes/controllers and callback surface.
- [x] `@876/work` session resource methods.
- [x] Invoice same-origin BFF with browser-safe connection projection.
- [ ] Ownership/authority regressions.
- [ ] Make local-calendar creation + calendar-mapping creation atomic.
- [ ] Persist/enforce remote read-only calendar mode or reject linking.

## 6D — synchronization

- [x] Manual connection/calendar sync service drafted.
- [x] Scheduler batch sync service drafted.
- [x] Remote → Work convergence drafted.
- [x] Work → provider convergence for supported non-recurring event shapes drafted.
- [x] Google/CalDAV cursor invalidation fallback and Microsoft window rollover drafted.
- [x] Health/error state updates drafted.
- [x] Fix remote-deletion/local-change recreation to reuse the existing event mapping.
- [x] Replace exact sync lookup batch scan with tenant-aware direct lookup.
- [ ] Add compare-and-set/lease protection so manual, calendar, and scheduler sync cannot run concurrently for the same connection.
- [ ] Eliminate N+1 event/mapping lookups and reduce per-event database round trips.
- [ ] Extract provider-neutral convergence from the oversized sync orchestration service.
- [ ] Sync orchestration regression tests: idempotency, concurrency, conflict resolution, deletion/recreation, cursor recovery, multi-calendar isolation.

## 6E — browser/widget pilot

- [x] Invoice BFF.
- [ ] `@876/work/browser` safe calendar-sync methods.
- [ ] Controlled Work UI.
- [ ] Widget Manage integration.
- [ ] OAuth return UX into the Manage surface.
- [ ] Browser/component regressions.

## Local AI review — 2026-09-09

The local orchestrator reviewed the Phase 6 branch after pulling the implementation and reported the following acceptance blockers. These are binding closeout items for this run. Full detail and required regressions are in [`review-handoff.md`](./review-handoff.md).

- [ ] **Blocker — lockfile:** restore the Work API package manifest to the existing dev-tool contract and update `pnpm-lock.yaml` for the new WorkOS Vault dependency so frozen installs succeed.
- [ ] **Blocker — TypeScript:** fix the Microsoft paginated calendar response inference (`TS7022`).
- [ ] **Blocker — SSRF:** replace permissive CalDAV URL acceptance with outbound-network policy that rejects loopback/private/link-local/reserved destinations, validates DNS resolution, forbids unsafe redirects, and allows only explicitly configured origins when a deployment allowlist is present.
- [ ] **High — concurrency:** add a sync lease / compare-and-set guard for connection and calendar sync so duplicate runs cannot race mappings or provider writes.
- [ ] **High — read-only calendars:** preserve remote `readOnly` state and enforce one-way pull behavior or reject linking; Phase 6 will use explicit pull-only mappings rather than attempting provider writes.
- [ ] **High — N+1 / timeout:** batch mapping retrieval and local-event lookup; avoid one mapping query per event and one local-event query per change where possible.
- [ ] **Medium — atomic linking:** calendar creation and calendar-link mapping must succeed atomically or compensate without leaving orphan calendars.
- [ ] **Medium — structure:** split convergence/conflict logic from lease/orchestration/provider health handling into independently testable units.

### Local verification snapshot supplied by orchestrator

- Existing `@876/work` tests: **243 passed**.
- Existing Work API tests: **575 passed**.
- `@876/work` compiles.
- Work API did **not** compile at the reviewed snapshot because of Microsoft TS7022.
- Normal pnpm verification was blocked by `ERR_PNPM_OUTDATED_LOCKFILE`.
- Only new focused Phase 6 tests at that snapshot covered credential sealing; provider adapters, OAuth lifecycle, authorization, sync conflict behavior, concurrency, idempotency, and recovery were not yet covered.

## 6F — closeout

- [ ] Resolve every local-review blocker/high finding above.
- [ ] Diff/adversarial review.
- [ ] Final test-case count.
- [ ] Final report.
- [ ] Orchestrator verification handoff.

## Notes

- No production verification has been executed from GPT Web.
- No PR is authorized by the user in this run.
- Raw provider tokens/passwords must never enter browser responses, ordinary Work resource serializers, logs, or `credentialRef`.
- Existing connection `syncCursor` is compatibility state; Phase 6 active cursors are per calendar mapping.
- Provider adapters, HTTP/session SDK, and the safe Invoice BFF are source-present. Phase 6 is not complete until the local-review blockers, browser/UI integration, focused tests, and final audit/report are finished.
