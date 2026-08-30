# GPT Web Brief — 876 Work Phase 2 productivity plane

**Branch:** `feature/work-phase-2-productivity-plane`
**Delegate:** ChatGPT Web
**Date:** 2026-08-30
**Local verification / migration owner:** next repository-capable agent

## Goal

Turn the Work service foundation into the shared 876 productivity plane without
redesigning CRM itself. Work must canonically own generic Tasks, Reminders, Calendars,
Events, assignments/delegation, recurrence, attached alerts, My Work aggregation, and
provider-sync metadata. CRM remains a contextual consumer.

## Required architectural constraints

1. Work is a service, not necessarily a standalone product entitlement.
2. Context is opaque and cross-service; never create cross-database foreign keys.
3. Request Notes remain CRM-owned.
4. Task assignment is first-class, not only `assigneeId`.
5. Calendar and per-user calendar subscription are separate resources.
6. Timed and all-day Event shapes are mutually exclusive.
7. Recurrence uses RFC 5545-compatible semantics and IANA timezone IDs.
8. Standalone Reminder and attached Alert remain distinct.
9. Work notification scheduling uses persistent outbox state, not process timers.
10. Provider sync stores only opaque credential references and local/remote mappings.
11. Provider sync implementation is architecture-only in this phase; do not implement
    Google/Microsoft/CalDAV OAuth or HTTP synchronization yet.
12. Widgets/shared UI are surfaces over Work (`dataOwner: external`), never Work's data
    owner.
13. Preserve CRM's current Request Task/Reminder contracts while exposing Request
    scheduling through Work Events.
14. Canonical Work resources stay flat on `$876`; do not introduce `$876.work.*`.
15. CRM request-scoped resources (`requestTasks`, `requestReminders`, `requestEvents`)
    are CRM projections, while canonical `tasks`, `reminders`, and `events` are Work
    resources.

## Current implementation on the branch

The branch contains the additive Work schema/migrations, expanded `@876/work`
contracts, operator/integration/session/scheduler access, Task v2 runtime, task lists,
links, assignments, recurrence, reminders, alerts, notification outbox, Calendars,
subscriptions, Events, participants, My Work, exports, provider-sync architecture,
CRM Request Event server/browser adapters, shared Work UI primitives, and migration
verification tooling.

The facade discrepancies identified after the initial handoff are also closed:

- `apps/crm/src/lib/876.ts` now actually supplies Work to the CRM composer using the
  signed-session tier (`CRM_API_876_KEY` + the current user's access token). CRM does
  not receive `WORK_INTERNAL_KEY`.
- `apps/crm/.env.development` and `.env.example` now declare `WORK_API_URL`.
- `RESOURCE_MANIFEST` includes `work` as a service owner and registers canonical Work
  nouns including tasks, task lists/links/assignments, reminders, recurrence, alerts,
  calendars/subscriptions, events/participants, My Work, sync metadata, and exports.
- CRM request task/reminder/event resources remain explicitly CRM-owned projections.
- `packages/client/src/work-surface.test.ts` is a facade contract for both CRM and
  Console: CRM gets the signed-session Work surface; Console gets the full operator
  surface; both remain flat rather than introducing a nested Work namespace.

## Integration warning

`main` advanced during this implementation. At the last recorded check it was
`44fccaccca0de5842ba9f266e5f63a9e844eb2a3` (PR #440, CRM split-view work), while this
feature branch had already diverged. ChatGPT Web deliberately did not manufacture a
fake merge commit because the available connector cannot compute a safe merged tree.

Before verification, rebase/merge **current** `origin/main` locally; do not rely on the
recorded SHA being the latest. Preserve current main for CRM UI/layout conflicts. The
new file `apps/crm/src/app/(app)/requests/_components/request-events.tsx` is
intentionally isolated so it can be mounted into the post-#440 Request layout after
the rebase.

## Required local execution

1. Rebase or merge current `origin/main`.
2. Regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
3. Run typecheck/lint/tests for core, work, work-api, crm, crm-api, client, and ui.
4. Specifically run `pnpm --filter @876/client test` so the new CRM/Console facade
   contract and `RESOURCE_MANIFEST` ownership tests execute.
5. Run service-bundle/database-env/format checks.
6. Apply Work migrations.
7. Run CRM→Work foundation migration/parity if the environment has not already cut
   over.
8. Run `pnpm --filter @876/work-api verify:phase2` after Phase 2 migrations.
9. Mount `RequestEventsSection` into the current-main Request UX and add/adjust tests
   around that placement.
10. Do not implement external provider synchronization as part of this handoff.
11. Do not drop legacy CRM Task/Reminder tables until production cutover/observation
    justifies a separate cleanup migration.
