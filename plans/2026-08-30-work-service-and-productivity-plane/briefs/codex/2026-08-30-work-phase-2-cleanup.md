# Codex brief — Work Phase 2 productivity plane, post-delegation cleanup

**Branch:** `feature/work-phase-2-productivity-plane` (already checked out, already merged with `main`).
**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`.
**Why this exists:** The Phase 2 branch was authored by ChatGPT Web, which cannot
execute anything. Prisma-schema, Zod-runtime, formatting, lockfile, and three stale
test suites have already been fixed locally. What remains are TypeScript errors that
only `tsc` could surface. Fix them — correctly, at the source, not by loosening types.

## Absolute constraints

- **Do not commit.** The orchestrating agent stages and commits. Leave the tree dirty.
- **Do not create, rename, delete, merge, or rebase any branch.** Do not touch `main`.
- **No `eslint-disable` comments anywhere.** A lint gate satisfied by disabling it is a
  failure, and it will be grepped for.
- **No `as any`.** Use `as unknown as T` only where an intentional type violation in a
  test fixture is genuinely the point; prefer fixing the fixture.
- **Do not weaken a production signature to make a test compile.** If a test fixture
  is missing a now-required field, add the field to the fixture. If a production type
  is genuinely wrong, fix the production type and say so in your report.
- **Do not run `prisma migrate`, `db push`, or anything that touches a database.**
  `prisma generate` is fine and already runs as part of `typecheck`.
- **Do not reformat files you are not otherwise changing.** The branch was just
  Prettier-formatted; a repo-wide format pass would bury the real change.
- **Do not add new features, routes, or resources.** This is a cleanup pass only.

## The errors to fix

Run this first to see them yourself; do not trust the transcription below alone:

```bash
pnpm --filter @876/work-api typecheck
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/client typecheck
```

### A. `apps/work-api` — 9 errors

1. **`src/modules/tasks/tasks.repository.ts:89` — TS2783 `'uid' is specified more
   than once, so this usage will be overwritten.`**
   `create()` builds `data: { id, uid: <generated>, ...params }`, so a caller-supplied
   `uid` silently wins and a caller that omits it gets `undefined` written over the
   generated value. This is the same defect as (3) below, seen from the other side.
   Decide one owner for `uid` and make the types say so. The intended contract is that
   **the repository generates the UID** (it is a stable iCalendar-style
   `<opaque>@work.876` identifier, and the service has no business inventing one), so
   `CreateTaskParams` must not carry `uid` at all — spread `params` *first*, then set
   the generated `id`/`uid`, and remove `uid` from `CreateTaskParams`.

2. **`src/modules/tasks/tasks.service.ts:169` — TS2345, `Property 'uid' is missing in
   type ... but required in type 'CreateTaskParams'.`**
   Resolved by (1). Verify the service compiles without inventing a UID of its own.

3. **`src/modules/exports/exports.service.ts:341` — TS5076 `'??' and '||' operations
   cannot be mixed without parentheses.`**
   The line is
   `const includeEvents = input.includeEvents ?? !includeTasks || Boolean(input.calendarId)`.
   **Read the surrounding function and decide the intended grouping before adding
   parentheses.** The line above it is
   `const includeTasks = input.includeTasks ?? Boolean(input.taskListId)`, which reads
   as "explicit flag wins; otherwise infer from whether a list was named". Mirror that:
   the explicit `includeEvents` flag must win outright, and the inference
   (`!includeTasks || Boolean(input.calendarId)`) applies only when the flag is absent.
   That means `input.includeEvents ?? (!includeTasks || Boolean(input.calendarId))`.
   State in your report that you checked this rather than parenthesizing arbitrarily.

4. **`src/modules/notification-outbox/notification-outbox.service.ts` — TS2339
   `Property 'due' does not exist on type '.../reminders/index'.` (two call sites)**
   `reminders/index.ts` re-exports only
   `{ list, retrieve, create, update, remove }` plus the router.
   Check whether `due(now, limit)` exists in `reminders.service.ts`. If it does, export
   it from `reminders/index.ts` — cross-module access goes through the module's public
   `index.ts` per `.claude/rules/express-api.md`, never a deep import. If it does
   **not** exist, implement it in `reminders.service.ts` + `reminders.repository.ts`
   (the outbox needs scheduled, not-yet-sent reminders whose `remindAt` is due, bounded
   by the limit, ordered deterministically) and export it. Only the repository may
   touch `prisma`. Say clearly in your report which of the two it was.

5. **`src/http/auth/guards.test.ts:15` — TS2741, the `IdentityGateway` mock is missing
   `sessionAccess`.**
   `IdentityGateway` gained `sessionAccess(params)` in Phase 2. Add a
   `vi.fn()`-backed `sessionAccess` to the mock. Read its real signature and return
   type in `src/http/auth/identity.ts` and give the mock a realistic default in
   `beforeEach` (per `.claude/rules/testing.md`, defaults live in `beforeEach` and are
   overridden per test).

6. **`src/http/auth/guards.test.ts:61` — TS2345, `IdentityApp` requires `slug`.**
   `vi.mocked(identity.appForApiKey).mockResolvedValue({ id: 'app_crm' })` — add the
   real slug (`'876-crm'`; confirm it against the platform app seeds in
   `apps/api/src/seeds/`, do not guess).

7. **`src/modules/reminders/reminders.service.edge.test.ts:39` — TS2322, fixture
   `timeZone` is `string | null | undefined` where the row type requires
   `string | null`.**
   Fix the fixture (give `timeZone` an explicit `string | null`), not the row type.

8. **`src/modules/tasks/tasks.service.edge.test.ts:47` — TS2322, fixture `links` /
   `assignments` are optional where the row type requires arrays.**
   A Phase 2 task row always carries `links` and `assignments` (the repository
   `include`s them). Fix the fixture to supply both, defaulting to `[]`.

**While you are in these two edge-test files:** they are the only coverage of the Phase 2
task and reminder services. After making them compile, confirm each `it()` still asserts
something that can fail (`.claude/rules/testing.md` — "every test must be able to fail").
If making a fixture valid has silently defeated an assertion, fix the assertion and note
it. Do not delete a test to make the file compile.

### B. `apps/crm-api` — 2 errors

9. **`src/modules/tasks/__tests__/tasks.work-adapter.edge.test.ts:33` — TS2322, the
   `WorkTask` fixture is missing the now-required `uid` and `listId`.**
   Add both to the fixture with realistic values (`uid` in the
   `task_<opaque>@work.876` form, `listId` a `tasklist_`-style opaque id — match the
   id shapes the Work repository actually generates).

10. **`src/modules/tasks/tasks.service.ts:25` — TS2322, `"WAITING"` is not assignable
    to CRM's `TaskStatus`.**
    Work's `WorkTaskStatus` gained `WAITING`, `DEFERRED`, and `FAILED`; CRM's own
    `TaskStatus` is narrower. **This is a real contract decision, not a cast.** CRM
    hosts Work tasks through an adapter, so a Work task in a state CRM does not model
    must be mapped deliberately, not asserted away. Read
    `apps/crm-api/src/modules/tasks/` in full and pick the mapping that preserves
    meaning — most likely folding the Work-only states onto the closest CRM state at
    the adapter boundary. **Add a test asserting the mapping for every
    `WorkTaskStatus` value**, so a future Work status addition fails loudly here
    instead of silently. Explain the mapping you chose in your report.

### C. `packages/client` — 1 error (plus one pre-existing, see below)

11. **`src/surface-contract.test.ts:147` — TS2345, `Property 'work' is missing` in the
    Console services fixture.**
    Console's composer now requires a `work: { operator: { … } }` service entry
    (see `packages/client/src/internal/types.ts` and
    `apps/console/src/lib/876/index.ts`). Add it to the test's Console options, shaped
    exactly like the other operator-tier service entries in that file.

**Pre-existing, fix it as a separate concern:**
`packages/core/src/fetch/bridge.ts:169` — `Property 'entries' does not exist on type
'Headers'`. This is **already failing on `main`** (verified), unrelated to Phase 2, but
it makes `pnpm --filter @876/client typecheck` fail outright so this branch's own client
changes cannot be verified. Fix it minimally — `apiResponse.headers.forEach((value, key)
=> …)` is the portable form and needs no lib change. Touch nothing else in that file.

## Verification — run every one of these, in the foreground, and report real output

```bash
pnpm --filter @876/work-api typecheck
pnpm --filter @876/work-api lint
pnpm --filter @876/work-api test
pnpm --filter @876/work-api boundaries
pnpm --filter @876/crm-api typecheck
pnpm --filter @876/crm-api lint
pnpm --filter @876/crm-api test
pnpm --filter @876/crm-api boundaries
pnpm --filter @876/client typecheck
pnpm --filter @876/client test
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
```

`boundaries` matters here: Phase 2 added fifteen Work modules, and item (4) is exactly
the kind of change that reaches for a deep cross-module import. If `boundaries` fails,
fix the import — do not relax the dependency-cruiser rule.

Then, over only the files you touched:

```bash
npx prettier --write <paths you changed>
grep -rn "eslint-disable\|as any" <paths you changed>
```

The grep must return nothing.

## Report

Write `.claude/reports/codex/2026-08-30-work-phase-2-cleanup.md` containing:

- one row per numbered item above, with **what you actually changed and why**;
- for items 3, 4, and 10, the reasoning behind the choice you made — these are
  judgement calls, not mechanical fixes, and the orchestrator will re-read them;
- the **counted** number of `it()` cases you added or modified per file;
- the verbatim final line of every verification command (test counts included, not
  just "passed");
- anything you could not fix, and why. A truthful "not fixed" beats a confident claim.

Do not commit the report either.
