# Phase 2 — give Projects a Work adapter, and move Reminder and EventAttendee onto it

## Context

`.agents/rules/` ADR-019 rule: **Work owns the productivity record, the host
owns the context.** CRM implements this. `apps/projects-api` does not — it
imports `@876/work` **zero** times and reimplements Work concepts locally.

This phase builds the adapter and converges the two smallest models. `TaskList`,
the calendar, and `Notification` are later phases — **do not touch them.**

## The template — read this first, it is 61 lines

```
apps/crm-api/src/providers/work.ts
```

It has exactly three exports:

- `workClient()` — the configured `@876/work` service client
- `crmRequestWorkContext(requestId)` — builds `{ contextService, contextResource, contextId }`
- `workErrorToCrm(error)` — maps a Work `AppError` onto a CRM error value

Then read how a caller uses it:

```
apps/crm-api/src/modules/reminders/reminders.service.ts
```

Note it calls `workClient().reminders.*` and makes **no** `prisma.` call, and
that it returns errors as values (`.agents/rules/error-handling.md`).

## Read budget: 6 files. Do not read more.

```
apps/crm-api/src/providers/work.ts                         (the template)
apps/crm-api/src/modules/reminders/reminders.service.ts    (a caller)
apps/projects-api/src/modules/calendar/calendar.repository.ts
apps/projects-api/src/modules/calendar/calendar.service.ts
apps/projects-api/prisma/schema/  — the Reminder and EventAttendee models only
packages/work/src/resources/reminders.ts                   (the client surface)
```

## Build

### 1. `apps/projects-api/src/providers/work.ts`

Mirror the CRM adapter:

- `workClient()` — the `@876/work` **service** entrypoint (`@876/work/service`),
  not `operator` and not `session`. Projects is a first-party service calling
  another first-party service (`.agents/rules/access-tiers.md`).
- `projectWorkContext(projectId)` and `issueWorkContext(issueId)` — context
  builders producing `contextService: 'projects'` with
  `contextResource: 'project' | 'issue'` and the id.
- `workErrorToProjects(error)` — maps a Work error onto a Projects error value
  using the Projects error registry. **Do not invent new error codes**; reuse
  what the registry already has, and if nothing fits, say so in your report
  rather than adding one.

Add `@876/work` to `apps/projects-api/package.json` dependencies, matching how
`apps/crm-api/package.json` declares it (same version specifier style).

### 2. Move `Reminder` onto Work

Every `prisma.reminder.*` call in
`apps/projects-api/src/modules/calendar/calendar.repository.ts` becomes a
`workClient().reminders.*` call **at the service layer, not the repository** —
`.agents/rules/express-api.md` says a repository may only query Prisma and a
service owns provider calls. So:

- delete the reminder functions from `calendar.repository.ts`;
- add them to `calendar.service.ts`, calling `workClient()`;
- carry the Projects context through so a reminder knows the project or issue
  it belongs to.

### 3. Move `EventAttendee` onto `WorkEventParticipant`

Same treatment for every `prisma.eventAttendee.*` call.

**If an event attendee is only ever reachable through a Projects `Event` that
this phase does not migrate, stop and report it** — moving the attendee without
its event would leave a dangling half. Say exactly what you found; do not
migrate the event.

### 4. Schema

Remove `Reminder` and `EventAttendee` from the Projects schema **only if
nothing else references them** — grep first, including relation fields on other
models. If something does, leave the model and report it.

Write any migration SQL by hand to
`apps/projects-api/prisma/migrations/<timestamp>_move_reminders_to_work/migration.sql`,
using the timestamp format of the existing folders.

**Do not run `prisma migrate dev`, `prisma migrate deploy`, or any command that
touches a database.** Dev and production share the same databases.

### 5. Tests

Minimum **10** `it()` cases, counted in your report:
- a reminder is created through Work with the Projects context attached;
- a Work error becomes a Projects error value, not a throw;
- listing reminders passes the project/issue context as a filter;
- an attendee is added through Work with the right participant shape;
- negative space: Work unavailable, Work returning `error`, an empty list.

Follow `.agents/rules/testing.md`: exact arguments with `toHaveBeenCalledWith`,
exact counts with `toHaveBeenCalledTimes`, complete result shapes, never a bare
`toBeDefined()`.

## Hard prohibitions

- Do not touch `TaskList`, the calendar's `Event` model, or `Notification` —
  later phases own them.
- Do not call `workClient()` from a repository. Services own provider calls.
- Do not throw a Work error; return it as a value.
- Do not run any database command.
- Do not add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do not touch `apps/crm-api` or any app other than `apps/projects-api`.
- Do not `git commit`, branch, or open a PR.

## Verify — one at a time, ~3 GB free

```
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api lint
pnpm --filter @876/projects-api boundaries
pnpm --filter @876/projects-api test
grep -rn "prisma.reminder\|prisma.eventAttendee" apps/projects-api/src | grep -v generated   # expect 0
```

If `pnpm` fails with `runDepsStatusCheck`, run `pnpm install` once first — you
changed a manifest.

## Report

`plans/sep/19-work-convergence/reports/opencode/2026-09-19-phase2.md` — the
adapter's three exports, every call site moved, whether `EventAttendee` could be
migrated independently of its event, the migration SQL, the counted `it()`
total, the final grep, verification output, anything unverified.
