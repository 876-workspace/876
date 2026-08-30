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

**Read this section carefully — it changed after the brief was first written.** A Codex
pass has since covered most of what this brief originally asked for. `apps/work-api`
now has **541 passing tests across 23 files**, and every resource client in
`packages/work/src/resources/` has a suite.

Do not rewrite, replace, or "improve" any of these. Integrate beside them.

| Area                                                                  | State                         |
| --------------------------------------------------------------------- | ----------------------------- |
| 17 of 18 `apps/work-api` modules                                      | service suites exist and pass |
| `apps/work-api/src/__tests__/work.phase2.routes.test.ts`              | 37 route/security cases       |
| `apps/work-api/src/http/auth/guards.test.ts`                          | operator/integration guards   |
| every `packages/work/src/resources/*.ts`                              | client suite exists           |
| `packages/work/src/types.test.ts`, `types.adversarial.test.ts`        | Work contracts                |
| `apps/crm-api/src/modules/events/__tests__/events.service.test.ts`    | CRM event adapter             |
| `apps/crm/src/app/(app)/requests/_components/request-events.test.tsx` | schedule UI                   |

`tasks.service.test.ts` remains your reference for a service test;
`work.phase2.routes.test.ts` for a route test.

**Off limits — another agent is editing these right now.** Do not touch any file under
`apps/crm-api/`, `packages/core/src/lib/errors/`, or the CRM Next app. A concurrent
Codex run owns them this session.

---

## 3. Scope — the four gaps that are actually left

### 3.1 `apps/work-api` tenants module — the only untested module

`src/modules/tenants/` has no test at all, and it is the module every other one depends
on: `requireTenant` gates all eighteen. Add `tenants.service.test.ts` — **at least 14
`it()` cases** — mocking `./tenants.repository.js` and letting the real service logic run.

Pin: `ensure` is idempotent (a second call returns the existing tenant id, does not
create a second row); ensure with an app connection attaches the scopes; ensure with an
existing connection **updates** rather than duplicating it; a SUSPENDED tenant is not
treated as active; `retrieveByOrganization` for an unknown org returns the registered
not-found value rather than throwing; the scope set on a connection is exactly what was
asked for, never a superset.

That last one matters more than the rest: the connection scope set is the consent record
an organization gave an app, and a bug that widens it silently is an authorization
defect. Assert it by value.

### 3.2 The three shared Work UI surfaces — no tests at all

`packages/ui/src/components/work-task-list.tsx`, `work-agenda.tsx`, and
`work-calendar-list.tsx` ship with zero coverage. **At least 8 `it()` cases each**,
colocated as `<name>.test.tsx`, following the existing suites in
`packages/ui/src/components/`.

Pin, per component: the empty state renders when the collection is empty and the custom
`empty` node is used when supplied; a populated list renders one row per item with the
right accessible text; the `renderTask`-style override actually overrides; ordering is
whatever the component promises (read it — do not assume); a null/absent optional field
renders a placeholder rather than the string `"null"` or a blank; and `className` is
applied rather than dropped.

These are presentation-only and own no persistence, so there is nothing to mock beyond
props. That makes them cheap coverage — and they are shared across every future product,
so a regression here is a regression everywhere.

### 3.3 Adversarial depth on the Work contracts

`packages/work/src/types.adversarial.test.ts` exists but is thin relative to how much
the Phase 2 contracts now encode. **Add at least 30 `it()` cases** to it (append; do not
restructure the file).

Target the invariants the schema exists to make unrepresentable — each one is a state
that must stay impossible:

- an event carrying **both** timed and all-day fields, and one carrying **neither**;
- `endAt` before `startAt`; `endDate` before `startDate`; equal values at each boundary;
- a timed event with no IANA time zone, and a time zone string that is not an IANA id;
- a task with `dueAt` but no `dueTimeZone`, and the reverse, on both create and update;
- `startAt` after `dueAt`;
- recurrence `count` and `untilAt` supplied together; `interval: 0`; `interval: -1`;
- `byMonthDay: 0` (invalid) against `-31` and `31` (both valid) and `32`/`-32`;
- `byMonth: 0` and `13`;
- an alert with neither a task nor an event parent, and one with both;
- an ABSOLUTE alert carrying an offset, and a RELATIVE alert carrying an instant;
- a participant that is `USER` with an email and no id, and `EMAIL` with an id and no
  email;
- `percentComplete` at `-1`, `0`, `100`, `101`;
- the security corpus from `.claude/rules/testing.md` against every free-text field
  (title, description, note, location, label), including the 10,000-character string;
- `{}` rejected by every update schema, and a single field accepted by each.

Assert the **exact** failure path where the schema names one — `result.error.issues[0].path`
— not merely `success === false`. A test that only checks the boolean passes when the
schema rejects for entirely the wrong reason.

### 3.4 Anything you find wrong while reading

You will read twelve modules and their tests closely. **Reporting a real defect is worth
more than another test file.** If an existing test cannot fail — a conditional assertion
block, a mock whose queued value is never consumed, an assertion on a value the test
itself supplied — say so in the report with the file and line. Do not silently rewrite
someone else's suite.

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

Before you finish each file, take every `it()` in turn and ask: _if I deleted the one
line of production code this is supposed to cover, would this fail?_ If the answer is
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
