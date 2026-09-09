# Phase 6 tracker — external calendar synchronization

Branch: `feat/work-widget-phase-6`

Baseline tree: `58599a9fc2e112e47ee5d5972177403469b46b53`

Status: `IN_PROGRESS`

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
- [ ] HTTP routes/controllers and callback surface.
- [ ] Ownership/authority regressions.

## 6D — synchronization

- [x] Manual connection/calendar sync service drafted.
- [x] Scheduler batch sync service drafted.
- [x] Remote → Work convergence drafted.
- [x] Work → provider convergence for supported non-recurring event shapes drafted.
- [x] Google/CalDAV cursor invalidation fallback and Microsoft window rollover drafted.
- [x] Health/error state updates drafted.
- [x] Fix remote-deletion/local-change recreation to reuse the existing event mapping.
- [x] Replace exact sync lookup batch scan with tenant-aware direct lookup.
- [ ] Sync orchestration regression tests.

## 6E — browser/widget pilot

- [ ] `@876/work` session resource methods.
- [ ] Invoice BFF.
- [ ] Browser adapter.
- [ ] Controlled Work UI.
- [ ] Widget Manage integration.
- [ ] Browser/component regressions.

## 6F — closeout

- [ ] Diff/adversarial review.
- [ ] Final test-case count.
- [ ] Final report.
- [ ] Orchestrator verification handoff.

## Notes

- No production verification has been executed from GPT Web.
- No PR is authorized by the user in this run.
- Raw provider tokens/passwords must never enter browser responses, ordinary Work resource serializers, logs, or `credentialRef`.
- Existing connection `syncCursor` is compatibility state; Phase 6 active cursors are per calendar mapping.
- Provider adapters and sync services are now source-present, but Phase 6 is not callable end-to-end until HTTP/SDK/BFF wiring and tests land.
