# Phase 2 — extend Work's reminders, then move Projects onto them

Two parts, in this order. Part B depends on Part A.

## Why

`.agents/rules/` ADR-019: **Work owns the productivity record, the host owns the
context.** CRM implements this; `apps/projects-api` imports `@876/work` **zero**
times and keeps its own `Reminder` table.

The schemas were compared before this brief was written. Projects' `Reminder`
has two capabilities `WorkReminder` does not, and **converging without adding
them first would silently drop data**:

| Projects `Reminder` | `WorkReminder` |
| --- | --- |
| `remindAt` nullable | `remindAt` **required** |
| `offsetMinutesBeforeDue` — "30 min before due" | absent |
| `channel` (`in-app`, default) | absent |
| `issueId` / `milestoneId` / `eventId` | `contextService` / `contextResource` / `contextId` ✓ |
| inline `recurrenceFreq/Interval/ByWeekday/Until/Count` | `recurrenceRuleId` → `WorkRecurrenceRule` ✓ (normalized, better) |

A relative reminder and a delivery channel are generic productivity concepts, so
they belong in Work — not in a Projects-local table.

---

## Part A — extend Work

**Scope: `apps/work-api` and `packages/work` only.**

1. `WorkReminder` gains:
   - `offsetMinutesBeforeDue Int?  @map("offset_minutes_before_due")`
   - `channel String @default("in-app")`
   - `remindAt` becomes **nullable** (`DateTime?`), because an offset-based
     reminder has no absolute time until it is resolved.
2. Add a **check constraint or service-level validation** that at least one of
   `remindAt` / `offsetMinutesBeforeDue` is set. A reminder with neither can
   never fire. Say in your report which you chose and why.
3. Surface both fields through the reminders module — schemas, serializer,
   routes, OpenAPI — following `.agents/rules/express-api.md` layer rules.
   Zod is the single source of truth; do not hand-write a second contract.
4. Expose them in `packages/work/src/resources/reminders.ts` so callers can set
   and read them.
5. **Write the migration SQL by hand** to
   `apps/work-api/prisma/migrations/<timestamp>_reminder_offset_and_channel/migration.sql`,
   using the timestamp format of the existing folders. The columns are
   additive; making `remindAt` nullable is a widening, also safe.
   **Do not run `prisma migrate dev`, `prisma migrate deploy`, or any command
   that touches a database** — dev and production share the same databases.
6. Tests: minimum **8** `it()` cases — an absolute reminder, an offset
   reminder, both set, **neither set is rejected**, channel defaults to
   `in-app`, an explicit channel round-trips, the serializer emits both fields,
   and an existing absolute-only reminder still works unchanged.

---

## Part B — Projects adapter and convergence

**Scope: `apps/projects-api` only. Do Part A first.**

### The template — read it, it is 61 lines

`apps/crm-api/src/providers/work.ts` exports exactly three things:
`workClient()`, a context builder, and an error mapper. Then read
`apps/crm-api/src/modules/reminders/reminders.service.ts` to see a caller: it
uses `workClient().reminders.*`, makes **no** `prisma.` call, and returns
errors as values (`.agents/rules/error-handling.md`).

### Build `apps/projects-api/src/providers/work.ts`

- `workClient()` — the `@876/work/service` entrypoint. **Not** `operator`, not
  `session`: Projects is a first-party service calling another
  (`.agents/rules/access-tiers.md`).
- Context builders producing `contextService: 'projects'` with
  `contextResource: 'issue' | 'milestone' | 'event'` and the id — these map
  Projects' three typed FK columns onto Work's context triple.
- `workErrorToProjects(error)` — maps a Work error onto a Projects error value
  from the existing registry. **Do not invent error codes**; if nothing fits,
  say so in your report rather than adding one.

Add `@876/work` to `apps/projects-api/package.json`, matching how
`apps/crm-api/package.json` declares it.

### Move `Reminder` onto Work

Every `prisma.reminder.*` call lives in
`apps/projects-api/src/modules/calendar/calendar.repository.ts`. Move them to
**`calendar.service.ts`** as `workClient().reminders.*` calls — a repository may
only query Prisma, and a service owns provider calls
(`.agents/rules/express-api.md`).

Map the fields explicitly, and list the mapping in your report:
- `issueId`/`milestoneId`/`eventId` → the context triple
- `offsetMinutesBeforeDue`, `channel`, `remindAt` → the Part A fields
- the five inline recurrence columns → a `WorkRecurrenceRule`

**If a Projects reminder field has no Work destination after Part A, stop and
report it.** Do not drop it and do not stash it in a metadata blob.

### Schema

Remove `Reminder` from the Projects schema **only if nothing else references
it** — grep first, including relation fields on other models. Write the
migration SQL by hand to
`apps/projects-api/prisma/migrations/<timestamp>_move_reminders_to_work/migration.sql`.
Again: **run no database command.**

### Tests

Minimum **10** `it()` cases, counted: a reminder created through Work carries
the Projects context; an offset reminder round-trips; a recurring reminder
produces a recurrence rule; a Work error becomes a Projects error **value**,
not a throw; listing filters by context; negative space — Work returning
`error`, an empty list, a reminder with neither time nor offset.

Follow `.agents/rules/testing.md`: `toHaveBeenCalledWith` with exact arguments,
`toHaveBeenCalledTimes` with exact counts, complete result shapes, never a bare
`toBeDefined()`.

---

## Hard prohibitions

- Do **not** touch `TaskList`. It is **not** a Work concept: Projects' carries
  `projectId`, `milestoneId`, `startDate`, `targetDate` and is read by
  `gantt.repository.ts`, while `WorkTaskList` has no date fields at all.
  Converging it would destroy project scheduling.
- Do **not** touch `ProjectEvent`, `EventAttendee`, or `Notification` — later
  phases own them.
- Do **not** call `workClient()` from a repository.
- Do **not** throw a Work error; return it as a value.
- Do **not** run any database command.
- Do **not** add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do **not** touch `apps/crm-api`.
- Do **not** `git commit`, branch, or open a PR.

## Verify — one at a time, ~3 GB free

```
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api test
pnpm --filter @876/work-api boundaries
pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api boundaries
grep -rn "prisma.reminder" apps/projects-api/src | grep -v generated    # expect 0
```

If `pnpm` fails with `runDepsStatusCheck`, run `pnpm install` once first.

## Report

`plans/sep/19-work-convergence/reports/opencode/2026-09-19-phase2.md` — the
Part A schema change and which validation you chose, both migration SQL files in
full, the adapter's exports, the explicit field mapping, every call site moved,
any field with no Work destination, counted `it()` totals for both parts, the
final grep, verification output, anything unverified.
