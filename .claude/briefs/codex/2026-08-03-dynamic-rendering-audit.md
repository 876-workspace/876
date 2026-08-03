# Brief — Dynamic-rendering audit: Console and Couriers

## Why

The user asked to "correctly mark the required pages as Dynamic — the ones where
the content will change", bearing in mind production deploys to Cloudflare via
`@opennextjs/cloudflare`.

The important thing to get right: **most of these routes are already dynamic and
do not need any marker.** A page that reads `cookies()` (every authenticated
route does, via the session guards) is dynamic by definition, so adding
`export const dynamic = 'force-dynamic'` to it is a no-op that adds noise and
implies a distinction that isn't there. Blanket-adding it would be the wrong
outcome.

This phase is therefore an **audit first, edits second**. Find where Next.js
actually gets the rendering mode wrong or where the build attempts to prerender
something it must not, and fix only those.

## Scope

- `apps/console`
- `apps/couriers`

Do **not** touch `apps/876`, `apps/enterprise`, `apps/billing`, `packages/`, or
`apps/api`.

## Step 1 — Establish the facts before editing anything

Run a production build for each app and capture the route table, which reports
each route as static (○), dynamic (ƒ), or prerendered:

```bash
pnpm --filter @876/console build:next
pnpm --filter @876/couriers build:next
```

(Use the pure Next build — `build:next` — **not** `build`, which is the OpenNext
Worker build and takes far longer. See the root `CLAUDE.md`.)

Save both route tables into your final report verbatim. That table is the
evidence for every decision that follows.

## Step 2 — Classify

For every route, decide which bucket it is in:

1. **Already dynamic, correctly** — reads cookies/headers/session, or uses
   `searchParams`. **Do nothing.** No `export const dynamic`. This will be the
   overwhelming majority.
2. **Genuinely static and correct to be static** — a pure marketing/error page
   (`access-denied`, `no-access`, `portal/unavailable`). **Do nothing.**
3. **Being prerendered but must not be** — the build statically renders it, yet
   its content varies per request or per deploy in a way that would serve stale
   or wrong data. **This is the only bucket that gets an edit.**
4. **Failing or warning during build** — a route that errors, warns about
   dynamic usage, or bails out of static generation unexpectedly. Report it;
   fix only if the fix is obvious and in scope.

## Step 3 — Edit only bucket 3

For a bucket-3 route, add the narrowest correct marker:

- Prefer `export const dynamic = 'force-dynamic'` when the route must never be
  cached.
- Add `export const revalidate = 0` **only** alongside it where the existing
  codebase already pairs them (see `apps/[slug]/page.tsx` and
  `orgs/provisioning/runs/`), for consistency — do not introduce the pair on its
  own.
- Never add a marker to a route already in bucket 1. If you cannot articulate
  what would break without the marker, it does not get one.

**Leave the three existing markers exactly as they are**
(`apps/console/.../apps/page.tsx`, `.../orgs/provisioning/runs/page.tsx`,
`.../orgs/provisioning/runs/[runId]/page.tsx`,
`apps/couriers/.../register/page.tsx`). They are pre-existing decisions and are
not part of this audit.

## Step 4 — Cloudflare/OpenNext check

Production runs on Cloudflare Workers through `@opennextjs/cloudflare`. Two
constraints from `docs/cloudflare.md` and the repo rules that this audit must
not violate:

- **No `proxy.ts` / `middleware.ts`.** If any exists, that is a bug — report it,
  do not add one.
- The `prisma` singleton is **request-scoped**, not per-isolate. Nothing in this
  phase should introduce module-level request state.

Confirm the route tables contain no route that would require Node-runtime
middleware, and report anything suspicious rather than "fixing" it speculatively.

## Rules

- `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md`,
  `.claude/rules/code-style.md` apply.
- Do **not** enable `cacheComponents`, use `use cache`, or export
  `unstable_instant` — deferred by explicit decision.
- Do not restructure any Suspense boundary or `loading.tsx`; that work is done
  and merged. This phase only adds/removes route-segment config.
- Do not commit, branch, stash, or run any `git` write command.

## Verification

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
```

**Run every one of these and paste the real tail of each.** Two previous runs on
this feature reported "verification passed" while typecheck was broken by a
duplicate import and 18 tests were failing. Do not summarize — quote the output.

## Report back

1. The full route table for both apps, verbatim.
2. A per-route classification into the four buckets (a table is fine; group
   bucket 1 rather than listing 120 rows individually, but be explicit about
   which routes are in buckets 2, 3 and 4).
3. Every edit you made and the specific reason it was bucket 3.
4. **If you made no edits at all, say so plainly** — that is a legitimate and
   likely outcome, and is a better result than inventing changes.

---

## Outcome (2026-08-03) — no code changes required

The audit ran and produced **no edits**. Recording the result here so the
question does not get re-asked and re-audited.

**Bucket 3 (prerendered but must not be) was empty.** Both production builds
already classify every content-bearing route as dynamic (`ƒ`):

- **Console** — every application and API route is dynamic. Protected pages
  inherit `requireSession()` from `(app)/layout.tsx`; the public `access-denied`
  and login routes read `searchParams`. Only `/_not-found` and
  `/manifest.webmanifest` are static, which is correct.
- **Couriers** — the root layout calls `getAuthSession()`, and the org/portal
  layouts resolve session or tenant context, so `/access-denied`, `/no-access`
  and `/portal/unavailable` are dynamic too. Only `/manifest.webmanifest` is
  static.
- **Bucket 4** — no build failures and no dynamic-rendering warnings in either
  app. The only lint output is a pre-existing
  `import/no-anonymous-default-export` warning on each `open-next.config.ts`.

This confirms the premise the brief was written on: **a route that reads
`cookies()` is already dynamic, so `export const dynamic = 'force-dynamic'`
would have been a no-op** on essentially every route in both apps. Adding it
broadly would have implied a distinction that does not exist. The four
pre-existing markers were left untouched.

Cloudflare/OpenNext checks also passed: neither app has `proxy.ts` or
`middleware.ts`, both Workers enable `nodejs_compat`, and Prisma remains lazy
and request-scoped via `createRequestScopedResolver`.

Verification (all quoted from real output in the run log): console typecheck /
lint / test — 557 passed, 49 files; couriers typecheck / lint / test — 799
passed, 72 files.
