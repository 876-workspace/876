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

## Current implementation on the branch

The branch contains the additive Work schema/migrations, expanded `@876/work`
contracts, operator/integration/session/scheduler access, Task v2 runtime, task lists,
links, assignments, recurrence, reminders, alerts, notification outbox, Calendars,
subscriptions, Events, participants, My Work, exports, provider-sync architecture,
CRM Request Event server/browser adapters, shared Work UI primitives, and migration
verification tooling.

## Integration warning

`main` advanced during this implementation. At the last check it was
`44fccaccca0de5842ba9f266e5f63a9e844eb2a3` (PR #440, CRM split-view work), while this
feature branch had already diverged. ChatGPT Web deliberately did not manufacture a
fake merge commit because the available connector cannot compute a safe merged tree.

Before verification, rebase/merge current `origin/main` locally. Preserve current main
for CRM UI/layout conflicts. The new file
`apps/crm/src/app/(app)/requests/_components/request-events.tsx` is intentionally
isolated so it can be mounted into the post-#440 Request layout after the rebase.

## Required local execution

1. Rebase or merge `origin/main`.
2. Regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
3. Run typecheck/lint/tests for core, work, work-api, crm, crm-api, client, and ui.
4. Run service-bundle/database-env/format checks.
5. Apply Work migrations.
6. Run CRM→Work foundation migration/parity if the environment has not already cut
   over.
7. Run `pnpm --filter @876/work-api verify:phase2` after Phase 2 migrations.
8. Mount `RequestEventsSection` into the current-main Request UX and add/adjust tests
   around that placement.
9. Do not implement external provider synchronization as part of this handoff.
10. Do not drop legacy CRM Task/Reminder tables until production cutover/observation
    justifies a separate cleanup migration.
