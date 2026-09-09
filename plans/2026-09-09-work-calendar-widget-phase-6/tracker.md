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

- [ ] Schema and migration.
- [ ] Secure-field binding.
- [ ] Credential repository/resolver.
- [ ] Mapping-level cursor state.
- [ ] Tests.

## 6B — providers

- [ ] Google OAuth + Calendar adapter.
- [ ] Microsoft OAuth + Graph Calendar adapter.
- [ ] CalDAV discovery + synchronization adapter.
- [ ] Shared normalized provider contracts/errors.
- [ ] Tests.

## 6C — authorization / linking

- [ ] OAuth authorize/state/callback.
- [ ] CalDAV credential setup.
- [ ] Account metadata resolution.
- [ ] Remote calendar discovery.
- [ ] Calendar link/import/unlink.
- [ ] Tests.

## 6D — synchronization

- [ ] Manual sync.
- [ ] Scheduler batch sync.
- [ ] Remote → Work convergence.
- [ ] Work → provider convergence for supported event shapes.
- [ ] Cursor invalidation/window rollover.
- [ ] Health/error state.
- [ ] Tests.

## 6E — browser/widget pilot

- [ ] `@876/work` session contract.
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
