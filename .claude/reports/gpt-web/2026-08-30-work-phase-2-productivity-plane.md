# 876 Work Phase 2 — ChatGPT Web Implementation Report

**Branch:** `feature/work-phase-2-productivity-plane`
**Date:** 2026-08-30
**Delegate:** ChatGPT Web
**Verification owner:** local repository/database-capable agent
**PR:** intentionally not created

## 1. Why this phase exists

This work began from the observation that CRM had the wrong final ownership boundary
for Tasks and Reminders. The user also wanted Calendar/Event behavior, delegation,
organization-wide personal work views, reusable widgets/surfaces, and future Google /
Microsoft / Apple-compatible synchronization.

The foundation PR extracted CRM Tasks/Reminders into Work. Phase 2 expands that
foundation into the reusable productivity plane while deliberately leaving the broader
future CRM redesign for later.

The final ownership rule is:

```text
CRM      owns relationships / requests / request history
Work     owns tasks / reminders / scheduling / calendars / events
Finance  owns financial primitives
Storage  owns files
Core     owns identity / membership / entitlement / app access
```

A resource being displayed inside CRM does not make CRM its canonical owner.

## 2. Data model implemented

### Tasks

Phase 2 adds task UIDs, task lists, task hierarchy, importance, start/deadline with
explicit timezone pairs, estimated duration, percent-complete, recurrence, links, and
first-class assignments.

The foundation `context_*` and `assignee_id` columns remain as compatibility
projections for the existing CRM adapter. The migration backfills them into
`WorkTaskLink` and `WorkTaskAssignment` rows.

### Assignment / delegation

`WorkTaskAssignment` records target type (USER/TEAM), assignee, role, lifecycle state,
who assigned it, response/completion timestamps, and delegation lineage. This prevents
the platform from encoding all collaboration into one mutable `assigneeId` field.

### Reminders and alerts

Standalone `WorkReminder` remains a user resource. `WorkAlert` belongs to exactly one
Task or Event and supports absolute or relative triggers. The two concepts are not
collapsed.

### Recurrence

`WorkRecurrenceRule` models DAILY/WEEKLY/MONTHLY/YEARLY recurrence with interval,
BYDAY/BYMONTHDAY/BYMONTH, count/until, week start, IANA timezone, and canonical RRULE.
The Work API uses the `rrule` package for recurrence evaluation.

### Calendars / subscriptions

`WorkCalendar` owns shared calendar metadata and events. `WorkCalendarSubscription`
owns per-user role, visibility, colour, and default reminder preferences. The first
owned calendar becomes the user's primary calendar and the owner receives an OWNER
subscription.

### Events / participants

`WorkEvent` supports timed or all-day forms, but not both simultaneously. It carries a
stable UID, one owning Calendar, recurrence information, status/busy status, optional
opaque host-service context, and participants.

`WorkEventParticipant` supports internal USER and external EMAIL participants, roles,
response state, and delegation metadata.

### My Work

My Work is implemented as an aggregate/read model over canonical Work resources rather
than a duplicate persistence layer.

### Notifications

The scheduler materializes due Reminder/Alert occurrences into
`WorkNotificationOutbox`. Outbox uniqueness includes `occurrenceKey`, which permits
recurring resources to fire repeatedly while keeping retries idempotent.

A scheduler-only access tier is protected by `WORK_CRON_SECRET` and is separate from
operator/integration/session authority.

### Provider sync metadata

`WorkSyncConnection` and `WorkSyncMapping` establish the future provider boundary.
Connections hold only opaque credential references plus provider/account/cursor/error
metadata. Mappings hold local ↔ remote resource IDs, ETags, iCalendar UID, content hash,
and sync timestamp.

No raw Google/Microsoft token columns were added.

## 3. Provider synchronization decision

The user explicitly narrowed this phase while it was in progress: **do not implement
actual Google or Microsoft synchronization yet; implement the architecture only.**

The branch therefore defines `WorkSyncCredentialResolver`,
`WorkSyncProviderAdapter`, and `WorkSyncProviderFactory`, but contains no concrete
Google, Microsoft, or CalDAV network adapter.

Future provider work should be a separate phase after credential storage/account-linking
is decided.

## 4. Access model

Work routes now distinguish:

- operator — `WORK_INTERNAL_KEY`;
- integration — app API key + active tenant-scoped Work connection + scope;
- signed session — app API key + bearer user token, verified through Core app
  membership/entitlement/effective permissions;
- scheduler — `WORK_CRON_SECRET`.

The global Work integration-scope vocabulary can expand without silently widening a
specific app's connection grant. CRM has an explicit grant.

## 5. CRM migration / integration

CRM Tasks and Reminders remain compatible host routes backed by Work.

Phase 2 adds CRM Request scheduling:

- CRM API Request Event list/retrieve/create/update/delete;
- Request Event participant CRUD;
- Work event context `{service:'crm', resource:'request', id:requestId}`;
- `@876/crm` `requestEvents` resource;
- unified `$876.requestEvents` composition;
- CRM browser-safe `/api/requests/:requestId/events` proxies;
- `client.requestEvents` browser client;
- `RequestEventsSection` controlled Request scheduling UI.

The UI component is intentionally not mounted into the Request page because `main`
advanced through PR #440 and replaced parts of the CRM detail composition after this
branch diverged. Mount it after the local rebase, preserving current-main structure.

## 6. Shared Work surfaces

Added controlled shared UI components:

- `@876/ui/work-task-list`;
- `@876/ui/work-agenda`;
- `@876/ui/work-calendar-list`.

They consume Work resources but own no persistence. This follows the repository's
widget rule: reusable surface does not equal data owner.

## 7. Interoperability architecture

Work contracts and schema intentionally support future mapping to:

- RFC 5545 iCalendar (`VEVENT`, `VTODO`, `VALARM`, `RRULE`);
- JSCalendar;
- CalDAV;
- Google Calendar / Tasks;
- Microsoft Graph Calendar / To Do.

Stable UIDs, named timezones, recurrence, participants, delegation metadata, and
provider mapping rows are created now so synchronization later does not require another
fundamental data-model migration.

Work owns `.ics` / JSCalendar export; host products do not implement independent
serializers.

## 8. Migration safety

The migration is additive. Existing Work rows are backfilled into default task lists;
legacy context/assignee projections are promoted into child resources. CRM legacy Task
and Reminder tables remain untouched.

A new command was added:

```bash
pnpm --filter @876/work-api verify:phase2
```

It validates post-migration structural invariants including default lists, task list
references, context/assignment backfills, task scheduling pairs, event time shapes,
primary calendar subscriptions, participant identity shape, alert shape, recurrence,
outbox occurrence keys, and obvious raw bearer-token values accidentally stored as a
credential reference.

No database migration or verifier was executed by ChatGPT Web.

## 9. Tests written / corrected

The stale foundation Work contract test was replaced with Phase 2 coverage for:

- context independence;
- general tasks with no CRM context;
- absence of `requestId` in canonical Task;
- start/timezone and due/timezone pair rules;
- task time ordering;
- assignment/delegation shape;
- timed versus all-day event variants;
- USER versus EMAIL participant identity;
- Alert parent/trigger shape;
- RFC-style recurrence input;
- empty mutation rejection;
- text limits.

Additional service, route, adapter, and client contract coverage was later added on the
same branch by the repository-capable agent before the final facade-tightening pass.

No test command was executed by ChatGPT Web.

## 10. Main advanced during implementation

The Phase 2 branch originally branched from `1a206343777fe6f3010ed7a32ee2ce6ab44a22a4`.
The user later noted `main` had advanced. At the recorded check, `main` was
`44fccaccca0de5842ba9f266e5f63a9e844eb2a3` after PR #440.

The available ChatGPT Web GitHub write tools can create commits/trees and move refs but
do not provide a safe native merge/rebase operation. A two-parent commit using an
unmerged tree would falsely mark main as merged while discarding its changes, so I did
not do that.

**The local agent must rebase/merge current main before executing this branch.** Do not
assume the recorded `main` SHA is still current; fetch first.

For conflicts under CRM Request/detail UI, preserve current main and mount the new
isolated `RequestEventsSection` into the new structure.

## 11. Required local work

```bash
git switch feature/work-phase-2-productivity-plane
git fetch origin
git rebase origin/main
pnpm install --lockfile-only
```

Then run:

```bash
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/work typecheck
pnpm --filter @876/work lint
pnpm --filter @876/work test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/client typecheck
pnpm --filter @876/client test
pnpm --filter @876/ui typecheck
pnpm check:service-bundle
pnpm check:database-env crm-api work-api
pnpm format:check
```

Then database work:

```bash
pnpm --filter @876/work-api db:deploy
pnpm --filter @876/work-api migrate:crm      # only if foundation data has not cut over
pnpm --filter @876/work-api verify:crm       # pre-cutover only
pnpm --filter @876/work-api verify:phase2
```

Finally mount the Request Events component into the rebased CRM Request surface and add
layout-level tests appropriate to the current-main structure.

## 12. Deliberately not implemented

- concrete Google sync;
- concrete Microsoft sync;
- concrete CalDAV sync;
- OAuth/provider account-linking UX;
- provider token/refresh implementation;
- standalone 876 Work product;
- destructive CRM legacy table removal;
- automatic Work widget rollout to every product.

Those are deferred rather than accidentally missing.

## 13. Facade discrepancy closure

A final review found that the Phase 2 **composer** and actual **application wiring** had
drifted apart. `packages/client/src/composers/crm.ts` already exposed Work whenever a
Work client was supplied, but `apps/crm/src/lib/876.ts` supplied only CRM and Core.
Therefore the real CRM app could not use canonical `$876.tasks`, `$876.events`,
`$876.calendars`, `$876.myWork`, and related resources even though the composer type
suggested it could.

This was corrected in commit `08920da7c104e414d54d7cb83c697414d7c6adcc`:

- `apps/crm/src/lib/876.ts` now supplies `services.work.session` using
  `WORK_API_URL`, CRM's own `CRM_API_876_KEY`, and the current signed user's access
  token. It does **not** receive or forward `WORK_INTERNAL_KEY`.
- `apps/crm/.env.example` and `.env.development` now declare `WORK_API_URL` so the
  actual CRM app can reach Work locally and documents the production requirement.
- `RESOURCE_MANIFEST` adds `work` to `ServiceOwner` and registers the canonical Work
  resource nouns: `tasks`, `taskLists`, `taskLinks`, `taskAssignments`, `reminders`,
  `recurrenceRules`, `alerts`, `calendars`, `calendarSubscriptions`, `events`,
  `eventParticipants`, `myWork`, `workSyncConnections`, `workSyncMappings`, and
  `workExports`.
- The manifest deliberately keeps `requestTasks`, `requestReminders`, and
  `requestEvents` CRM-owned. They are request-scoped compatibility/context projections
  whose canonical underlying records live in Work.
- The manifest's ownership-contract tests now accept `work` as a valid service owner.
- `packages/client/src/work-surface.test.ts` was added as a facade contract:
  - CRM must expose the signed-session Work surface as flat `$876` nouns while keeping
    request projections available;
  - CRM must not expose the operator sync-management facade;
  - Console must expose the full Work operator surface, including sync metadata;
  - neither app introduces a nested `$876.work.*` namespace.

Console required no application-factory patch: `apps/console/src/lib/876/index.ts` was
already wired to `services.work.operator` with `WORK_API_URL` and `WORK_INTERNAL_KEY`.
The discrepancy was specifically CRM's missing application-level Work configuration.

These facade tests are code artifacts only until the local agent runs
`pnpm --filter @876/client test` after rebasing onto current `main`.

## 14. No claims of execution

ChatGPT Web did not run pnpm, Prisma, migrations, Vitest, ESLint, Next builds, or the
service in this environment. The code and migration/verifier artifacts were written to
the branch, but execution remains the local agent's responsibility.
