# Fix the couriers envelope test's false positive

## The defect

`apps/couriers/src/lib/api-envelope-routes/index.test.ts` scans every
`src/app/api/**/route.ts` and asserts each one uses a canonical response helper:

```ts
const CANONICAL_HELPERS =
  /\b(?:apiError|apiJson|apiSuccess|errorResponse|invalidRequest|resultResponse)\b/
```

Two routes fail it:

```
apps/couriers/src/app/api/manage/items/route.ts
apps/couriers/src/app/api/manage/items/[id]/route.ts
```

**They are not defective.** They use canonical envelopes through named local
wrappers in `apps/couriers/src/app/api/manage/items/_lib/`:

```ts
if (!body.success) return invalidItemRequest()
return itemResultResponse(…)
```

The regex matches the canonical helper names literally, so a route that
delegates through a correctly-named wrapper reads as a violation. The test is
wrong, not the routes.

This is a **pre-existing** failure — the test file and both routes are
byte-identical to `main`.

## What to do

**Read first:** the test, both route files, and everything in
`apps/couriers/src/app/api/manage/items/_lib/`. That is 5 files. Do not read
more.

Make the test follow a one-level wrapper instead of loosening the regex:

- when a route's source does not match `CANONICAL_HELPERS` directly, resolve
  the modules it imports from a sibling `_lib/` directory and check whether the
  **wrapper** matches;
- a wrapper that itself uses a canonical helper satisfies the route;
- a route that matches neither directly nor through its `_lib/` wrapper still
  fails, with a message naming which file was checked.

**Do not** simply add `invalidItemRequest|itemResultResponse` to the regex.
That hard-codes two names and the next wrapper reintroduces the same false
positive.

**Do not** weaken the two negative assertions that follow it:

```ts
expect(source).not.toMatch(/\b(?:NextResponse|Response)\.json\s*\(/)
expect(source).not.toMatch(/\bapiJson\(\s*\{\s*error\s*:/)
```

Those must keep applying to the route file itself.

## Prove the test can still fail

Add a temporary route file that returns `Response.json({ ok: true })` directly,
confirm the suite fails and names it, then **delete the temporary file**. Paste
both runs into your report. A gate that cannot fail is not a gate.

## Hard prohibitions

- Do not edit either `items` route, or anything under `_lib/`.
- Do not add names to the regex as the fix.
- Do not add `eslint-disable`, `@ts-ignore`, `as any`, or `as unknown as`.
- Do not touch any app other than `apps/couriers`.
- Do not `git commit`, branch, or open a PR.

## Verify

```
pnpm --filter @876/couriers-app test
pnpm --filter @876/couriers-app typecheck
```

The suite has 1277 tests and currently reports 2 failures. Expect 1277 passing.

## Report

`plans/sep/19-work-convergence/reports/cline/2026-09-19-couriers-envelope.md` —
how the wrapper resolution works, the passing run, the deliberate-failure run,
and anything you could not verify.
