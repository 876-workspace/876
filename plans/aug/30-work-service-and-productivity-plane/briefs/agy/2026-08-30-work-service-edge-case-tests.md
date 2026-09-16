# Work service — adversarial edge-case test pass

You are adding tests only. **Do not change production code.** If a test you write
exposes a genuine bug, leave the test failing and describe the bug in your report —
do not "fix" it by weakening the test or editing the source.

## Repository orientation

- `packages/work` — the Work contract package (Zod schemas + typed HTTP resources).
- `apps/work-api` — the Work Express service (Prisma). Modules under
  `src/modules/{tasks,reminders,tenants}/` split into
  `*.routes.ts` / `*.controller.ts` / `*.service.ts` / `*.repository.ts` / `*.schemas.ts`.
- `apps/crm-api` — CRM, which is now an _adapter_ over Work. See
  `src/modules/tasks/tasks.service.ts`, `src/modules/reminders/reminders.service.ts`,
  and `src/providers/work.ts`.

Read `.claude/rules/testing.md` in full before writing anything. It is the standard
your work is judged against. The rules that matter most here:

- Every test must be able to fail. If deleting the production line under test would
  not break your test, rewrite the test.
- `expect(x).toBeDefined()` is never an acceptable sole assertion.
- Assert **both** sides of every `{ data, error }` result.
- Assert exact call arguments with `toHaveBeenCalledWith(...)` and exact counts with
  `toHaveBeenCalledTimes(n)` — never bare `toHaveBeenCalled()`.
- Explicitly assert `not.toHaveBeenCalled()` when a guard should have blocked a
  downstream call.
- `vi.clearAllMocks()` in `beforeEach`; `vi.useRealTimers()` in `afterEach` whenever
  fake timers are used.
- Each test file defines its own factories with realistic domain data — no `'test'`,
  no `'foo'`. No shared fixture files.

## Do not touch these files

Another agent owns them. Adding a file that already exists will collide:

- `apps/work-api/src/**/__tests__/*.routes.test.ts`
- `apps/work-api/src/modules/tasks/tasks.service.test.ts`
- `apps/work-api/src/modules/reminders/reminders.service.test.ts`
- `packages/core/src/lib/errors/work.catalog.advanced.test.ts`
- `packages/work/src/types.test.ts`

## The four files to create

### 1. `packages/work/src/types.adversarial.test.ts`

Contract hardening for every exported Zod schema in `packages/work/src/types.ts`.

Build a security corpus and apply it with `it.each` to **every** free-text string
input on `createWorkTaskInputSchema`, `updateWorkTaskInputSchema`,
`createWorkReminderInputSchema`, `updateWorkReminderInputSchema`, and
`workContextSchema`. The corpus must contain, each written as a JS string literal
using escape sequences rather than raw characters where the character is invisible
or non-printing:

1. `'<script>alert(1)</script>'`
2. `"' OR '1'='1"`
3. `'../../etc/passwd'`
4. `'__proto__'`
5. `'constructor'`
6. `'�'` (NUL)
7. `'‮'` (right-to-left override)
8. `'\uD800'` (lone high surrogate — not valid UTF-8 when encoded)
9. `' '` (non-breaking space, alone)
10. `'a'.repeat(10_000)`
11. `'a'.repeat(10_001)`

For each, assert the concrete outcome: a value that is _accepted_ must round-trip
byte-for-byte unchanged (the schema must not silently sanitize), and a value that is
_rejected_ must be rejected for the documented reason (length, emptiness). Cover
specifically:

- `title` is trimmed and bounded to 240 — assert 240 passes, 241 fails, and that a
  title built from 240 four-byte emoji behaves according to the schema's actual rule
  (JS `String.length` counts UTF-16 code units, so 240 emoji is 480 units). State in
  a comment which unit the bound is in, and assert the real behaviour.
- Whitespace-only titles: `'   '`, `'\t'`, `'\n'`, `' '`. Assert exactly which
  of these `.trim()` strips — JS `.trim()` _does_ strip ` `. Prove the
  behaviour; do not assume it.
- `description` / `note` bounded to 10 000, tested either side of the boundary.
- `strictObject` genuinely rejects an unknown key on every input schema.
- The `.refine()` on both update schemas rejects `{}` and accepts a single field —
  including a single field explicitly set to `null`.
- `dueAt` / `remindAt` accept negative integers (pre-1970), `0`, and
  `Number.MAX_SAFE_INTEGER`; reject `1.5`, `NaN`, `Infinity`, `-Infinity`, and the
  string `'1234'`.
- `workContextSchema` requires all three parts, rejects an empty string in any of
  them, and trims each.
- Prototype pollution: parsing an input object that carries a `__proto__` key must
  not pollute `Object.prototype`. Assert
  `({} as Record<string, unknown>).polluted === undefined` afterwards.

### 2. `apps/work-api/src/modules/tasks/tasks.service.edge.test.ts`

Mock the repository module and the tenants module; do not touch a database. Cover the
completion-stamping state machine exhaustively — every transition, one `it()` each:

```
OPEN         -> IN_PROGRESS   completedAt stays null
OPEN         -> DONE          completedAt stamped, completedBy set
IN_PROGRESS  -> DONE          completedAt stamped
DONE         -> DONE          completedAt NOT re-stamped (idempotent)
DONE         -> OPEN          completedAt and completedBy both cleared
DONE         -> CANCELLED     completedAt and completedBy both cleared
DONE         -> (no status)   completedAt untouched
CANCELLED    -> DONE          completedAt stamped
```

Freeze time with `vi.useFakeTimers()` + `vi.setSystemTime()` and assert the stamped
`completedAt` equals the frozen instant exactly. Then also assert:

- transitioning to `DONE` with no `completedBy` stores `null`, not `undefined`;
- an update with `status: 'DONE'` on a task that already has `completedAt` does not
  call the repository with a `completedAt` key at all (use `toHaveBeenCalledWith` and
  an exact object, not `objectContaining`);
- a tenant that does not exist returns `work/tenant-not-found` and the task
  repository is **never** called;
- a `SUSPENDED` tenant returns `work/tenant-inactive` and the repository is never
  called;
- an update to a soft-deleted task returns `null`;
- serialization: a row whose `contextService` is set but `contextResource` is `null`
  serializes `context` as `null` rather than a half-built object;
- timestamp serialization floors rather than rounds — a `Date` at `…:00.999` must
  serialize to the same Unix second as `…:00.000`, and a pre-epoch date must not
  round the wrong way (`Math.floor(-0.5)` is `-1`; assert the real behaviour).

### 3. `apps/work-api/src/modules/reminders/reminders.service.edge.test.ts`

The same treatment for reminders: every status transition
(`SCHEDULED` → `SENT` → `DISMISSED` → `CANCELLED`, and the invalid backwards moves),
the `sentAt` / `dismissedAt` stamping rules, tenant-missing and tenant-suspended
guards with `not.toHaveBeenCalled()` assertions, soft-deleted lookups, and a
`remindAt` in the past — which must be **accepted**, because a reminder can
legitimately be created already overdue during a data import.

### 4. `apps/crm-api/src/modules/tasks/__tests__/tasks.work-adapter.edge.test.ts`

The cross-service boundary. Mock `@876/work/operator` (or `../../providers/work.js`)
and the CRM priorities + requests modules. This is the most valuable file — cover:

- **Request isolation.** A Work task whose `context.id` is a _different_ request id
  must not be updatable or deletable through this request's URL. Assert the adapter
  returns `null` and that `work.tasks.update` is **never** called.
- **Service isolation.** A Work task whose `context.service` is `'couriers'` but
  whose id matches must likewise be rejected.
- **Work outage.** A Work network failure returns `crm/work-unavailable`; assert the
  full error object (`code`, `message`, `httpStatus`) and that CRM does not throw.
- **Malformed Work payload** (missing `status`, wrong `object` discriminator, `dueAt`
  as a string) surfaces as an error value, never a crash.
- **Work not-found** maps to `null` so CRM answers its own 404 — distinct from
  `crm/work-unavailable`.
- **Ordering of validation.** The CRM request context is validated _before_ Work is
  called: for an unknown request, assert the Work client was never invoked.
- **Priority enrichment.** A Work task carrying a `priorityId` that CRM no longer
  recognizes returns `crm/priority-not-found`, not a task with a null priority.
- **Priority is never sent to Work as a relation** — assert the object passed to
  `work.tasks.create` carries `priorityId` as a plain string and contains no
  CRM-shaped priority object.
- **The CRM response contract is unchanged**: assert the full `request_task` shape
  field by field, including `object: 'request_task'` (not `'task'`).

## Verification — run these and report the real output

```
pnpm --filter @876/work     test
pnpm --filter @876/work-api test
pnpm --filter @876/crm-api  test
```

## Report

Write `.claude/reports/agy/2026-08-30-work-edge-case-tests.md` containing: each file
created, the **counted** number of `it()` cases in it, the exact pass/fail output of
the three commands above, and a numbered list of every genuine production bug your
tests exposed (with the failing test name). Do not claim a suite passed unless you
ran it and saw it pass.
