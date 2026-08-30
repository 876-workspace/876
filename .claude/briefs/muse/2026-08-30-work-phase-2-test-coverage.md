# Muse brief — Work Phase 2 productivity plane, test coverage

**Repository:** `/root/projects/876` (pnpm monorepo).
**Branch:** `feature/work-phase-2-productivity-plane` — already checked out. Stay on it.
**Your job:** write real, failure-capable tests for the Phase 2 Work productivity
plane and its CRM host surface. You are writing **tests only**.

Read `.claude/rules/testing.md` in full before you write a single `it()`. It is the
exhaustive standard this repository is graded against, and this brief assumes it
rather than restating it. Read `.claude/rules/express-api.md` for the module/layer
shape, and `.claude/rules/error-handling.md` for how expected failures travel as
values rather than exceptions.

---

## 1. The one thing that decides how you work

**You cannot run any command in this container.** Your bash tool is sandboxed through
bubblewrap and `bwrap` cannot create a namespace here, so `pnpm test`, `pnpm
typecheck`, `pnpm lint`, `prettier`, and `prisma` all fail for you. Every test you
write will be executed for the first time by the orchestrating agent, after you finish.

Two consequences, and they are not negotiable:

- **Never write that tests pass.** Write "not executed; verification is the
  orchestrator's". A fabricated green result is worse than a missing test file.
- **Read the implementation before you mock it.** You cannot discover a wrong import
  path, a renamed export, or a changed signature by running anything, so the only
  defence is reading the actual module — its imports, its exported names, its exact
  return shape — and matching it character for character.

Three specific traps that have bitten previous delegated runs in this repo, all of
which a runnable test suite would have caught in seconds:

1. **Frozen time.** If a fixture expresses a timestamp relative to a `NOW` constant,
   `vi.useFakeTimers()` + `vi.setSystemTime(NOW)` must actually be set, and
   `vi.useRealTimers()` must run in `afterEach`. Without it every "due" fixture is
   already stale against the real clock and the assertions invert.
2. **`mockResolvedValueOnce` leakage.** `clearMocks` does **not** drain the once-queue.
   Never queue more `…Once` values than the test consumes; a leftover leaks into the
   next test and silently overrides its stub — which is how an authorization
   assertion ends up passing while testing nothing.
3. **The strict-vs-loose schema mismatch.** These contracts are `z.strictObject`;
   an extra field is a rejection, not an ignored key. Check the real schema before
   asserting that a body is accepted.

---

## 2. What already exists — do not duplicate or overwrite it

These files exist and pass. **Integrate beside them; never replace them, never delete
another agent's tests, and never rewrite one to make your own fixture fit.**

| File | Covers |
| --- | --- |
| `apps/work-api/src/modules/tasks/tasks.service.test.ts` | task service happy paths |
| `apps/work-api/src/modules/tasks/tasks.service.edge.test.ts` | task service edges |
| `apps/work-api/src/modules/reminders/reminders.service.test.ts` | reminder service |
| `apps/work-api/src/modules/reminders/reminders.service.edge.test.ts` | reminder edges |
| `apps/work-api/src/modules/connections/connections.service.test.ts` | app connections |
| `apps/work-api/src/http/auth/guards.test.ts` | operator/integration guards |
| `apps/work-api/src/__tests__/work.routes.test.ts` | assembled route surface |
| `packages/work/src/types.test.ts`, `types.adversarial.test.ts` | Work contracts |
| `packages/work/src/integration.test.ts`, `integration-scopes.test.ts` | client + scopes |
| `packages/crm/src/modules.test.ts` | CRM module/permission drift |
| `apps/crm/src/app/(app)/requests/_components/request-events.test.tsx` | schedule UI |

**`tasks.service.test.ts` is your reference for a service test** (module-level
`vi.mock` of the repository and the tenants module, a `row()` factory with
overrides, `vi.clearAllMocks()` in `beforeEach`). **`work.routes.test.ts` is your
reference for a route test** (`vi.hoisted` mocks, mock the *repository* not the
service, drive the assembled app with supertest so guards, validation, the envelope
middleware and the error handler all really run).

---

## 3. Scope — what to write

Twelve of the eighteen Work API modules have **no tests at all**, and the CRM API
events module has none. That is the gap.

### 3.1 `apps/work-api` service tests — highest priority

Write `<module>.service.test.ts` beside each service. Mock the module's own
`*.repository.js` and the `../tenants/index.js` module; **let the real service logic
and the real Zod schemas run.** Never mock a pure helper the service owns — that
tests the mock.

| Module | Minimum `it()` cases | The behaviour that must be pinned |
| --- | --- | --- |
| `task-lists` | 14 | default-list creation is idempotent; `ensureDefault` returns the existing default rather than making a second one; exactly one default per tenant; deleting a list that still holds tasks; renaming; sort order |
| `task-assignments` | 16 | create/accept/decline/complete transitions; delegation lineage (`delegatedFromAssignmentId`); USER vs TEAM target; a second OWNER; responding to an already-completed assignment; assigning on a task in another tenant |
| `task-links` | 12 | exactly one `isPrimary` link per task; promoting a new primary demotes the old one in the same transaction; the `(service, resource, externalId)` triple; removing the primary; a link to a resource CRM does not own |
| `calendars` | 14 | the first owned calendar becomes primary; the owner gets an OWNER subscription on create; PRIVATE vs ORGANIZATION visibility; deleting a calendar that holds events; a second primary |
| `calendar-subscriptions` | 12 | per-user role/colour/visibility/default reminders; one subscription per (calendar, user); unsubscribing the owner; a subscription to a calendar in another tenant |
| `events` | 20 | **timed and all-day are mutually exclusive** — a payload carrying both is rejected, and so is one carrying neither; `endAt` before `startAt`; `endDate` before `startDate`; a named IANA time zone is required for a timed event; status and busy-status transitions; the opaque host context round-trips unchanged |
| `event-participants` | 14 | USER participants carry `participantId` and no `email`; EMAIL participants the reverse; **neither-or-both is rejected**; response transitions; DELEGATED sets `delegatedTo`; duplicate participant on one event |
| `alerts` | 14 | an alert belongs to **exactly one** Task or Event — zero parents rejected, two parents rejected; ABSOLUTE carries an instant and RELATIVE an offset, never both; negative (before) and positive (after) offsets; status transitions |
| `recurrence-rules` | 18 | each frequency; `interval` ≥ 1; `BYDAY`/`BYMONTHDAY`/`BYMONTH` bounds — **`byMonthDay: 0` is invalid, `-31` and `31` are valid**; `count` and `untilAt` are mutually exclusive; `weekStart`; the canonical RRULE string produced for each shape |
| `my-work` | 14 | aggregates across lists/calendars **without duplicating** an item that is both assigned and owned; scoping to the acting user only; a user with nothing; date-window boundaries (an item exactly on each edge) |
| `exports` | 16 | `.ics` shape for VEVENT/VTODO/VALARM/RRULE; `includeTasks`/`includeEvents` defaulting (read the real defaulting logic — it is subtle); an all-day event serializes as a DATE not a DATE-TIME; escaping of `,` `;` `\` and newlines in a summary; an empty export |
| `notification-outbox` | 16 | a non-recurring due reminder enqueues once; a recurring one enqueues **one row per occurrence**; `occurrenceKey` makes a retry idempotent while still allowing the next occurrence; a not-yet-due reminder enqueues nothing; a reminder whose recurrence rule is missing; the batch limit is honoured |
| `sync-connections` | 12 | provider/account/cursor/error metadata; status transitions; **a credential reference is a reference, never a raw token** — assert that a value looking like a bearer token is not persisted as one |
| `sync-mappings` | 10 | local↔remote id pairs; ETag and content-hash update; the iCalendar UID; one mapping per (connection, local resource) |

**Every module in this table must also have negative-space tests**: for each guard
clause, assert the repository was **not** called (`expect(repo.create).not.toHaveBeenCalled()`),
and assert the exact returned error code — `expect(result).toEqual({ code: 'work/…',
message: …, httpStatus: … })`, not `expect(result.code).toBeDefined()`.

### 3.2 `apps/work-api` route tests

Add `apps/work-api/src/__tests__/work.phase2.routes.test.ts`, modelled on
`work.routes.test.ts`, driving the assembled app with supertest. **At least 30
`it()` cases.** Cover, for the Phase 2 route families (task lists, assignments,
links, calendars, subscriptions, events, participants, alerts, recurrence, my-work,
exports, sync):

- the **operator** tier with a correct `WORK_INTERNAL_KEY`;
- the operator tier with a wrong key, and with **no** key;
- **`WORK_INTERNAL_KEY` unset entirely must reject every request** — an empty secret
  must never mean "allow". This is the single most important test in the file;
- the **integration** tier with a connection that holds the scope, and one that does
  not (assert the exact 403 code, and that the service was never reached);
- the **scheduler** tier and `WORK_CRON_SECRET`, including the unset case;
- an unknown path returns **404, not 401** — guards attach per route, never with
  `router.use`;
- a validation failure returns the envelope with `data: null` and a client-safe
  error carrying **no `httpStatus` field in the body**;
- a successful list returns `{ object: 'list', data, has_more, url, total_count }`.

### 3.3 `apps/crm-api` events module

Add `apps/crm-api/src/modules/events/__tests__/events.service.test.ts` — **at least
18 `it()` cases**. CRM hosts Work events through an adapter, so pin the boundary:

- the Work event context is exactly `{ service: 'crm', resource: 'request', id: requestId }`;
- an event belonging to a different request is not returned;
- a request that does not exist returns `crm/request-not-found` as a **value**, not a throw;
- timed and all-day creation, and the rejection of a payload that is both or neither;
- participant create/update/delete;
- a Work-tier failure is surfaced as a CRM error value with its own stable code, and
  the raw upstream message is **not** leaked to the caller.

### 3.4 `packages/work` resource clients

Add one `<resource>.test.ts` per file under `packages/work/src/resources/` that has
none. **At least 6 `it()` cases each**, following `packages/work/src/integration.test.ts`:
a `vi.fn()` fetch, then assert the **method, the exact URL and path parameters, the
serialized body, and the credential header** — and that a returned error propagates
as `{ data: null, error }` rather than throwing.

---

## 4. Hard rules

- **Tests only.** Do not change production code. If a test cannot be written without
  a production change, **skip it and say so in your report** — name the file, the
  behaviour, and what change would be needed. Do not make the change yourself.
- **Never weaken production code for testability.** Not a loosened signature, not an
  added optional parameter, not an exported internal.
- **No `eslint-disable`, anywhere, for any reason.**
- **No `as any`.** Use `as unknown as T`, and only where an intentional type
  violation is the point of the test (a value arriving over HTTP that TypeScript
  cannot constrain).
- **No snapshot tests** unless the thing under test is genuinely a serialized
  document (the `.ics` export is the one legitimate candidate — even there, assert
  the specific lines that matter as well).
- **No `try/catch` inside a test body** — use `.rejects.toThrow()` or a
  `mockRejectedValue`.
- **Every test file defines its own factories.** No shared fixture file. Defaults are
  realistic domain data — Jamaican place names, `America/Jamaica`, plausible ids in
  the repository's real shapes — never `'test'` or `'foo'`.
- **Factories are called inside `it()`**, never at module level, so no test can
  mutate another's state.
- Assert **both** sides of every `{ data, error }` result.
- Assert call counts as exact numbers (`toHaveBeenCalledTimes(1)`), and arguments
  with `toHaveBeenCalledWith(...)`, never a bare `toHaveBeenCalled()`.
- Do not commit, do not create or switch branches, do not open a pull request.
- Do not touch `main`, `pnpm-lock.yaml`, any `.prisma` file, or any migration.

---

## 5. The bar, stated plainly

Before you finish each file, take every `it()` in turn and ask: *if I deleted the one
line of production code this is supposed to cover, would this fail?* If the answer is
no or maybe, rewrite it. A file of thirty tests that cannot fail is worth less than
five that can, and it is worse than nothing because it reads as coverage.

The tests that matter most here are the **invariant** ones — an event that is both
timed and all-day, an alert with two parents, a participant that is both USER and
EMAIL, a second default task list, an empty `WORK_INTERNAL_KEY` that authorizes.
Those are the states the schema and the service exist to make impossible, and a test
that proves they stay impossible is the reason this brief exists.

---

## 6. Report

Write `.claude/reports/muse/2026-08-30-work-phase-2-test-coverage.md` (do not commit
it) containing:

- one row per file you created, with the **counted** number of `it()` cases in it —
  count them, do not estimate;
- the invariants you pinned, per module, in one line each;
- **everything you could not test and why**, including any test you skipped because
  it would have required a production change (name the change);
- anything in the implementation that looked wrong to you while reading it. You are
  reading twelve untested modules closely; you will see defects, and reporting one is
  more valuable than another test file;
- a plain statement that nothing was executed.

The orchestrating agent runs:

```bash
pnpm --filter @876/work-api test
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/work test
```

Write your tests so they survive those.
