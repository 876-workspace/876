# Couriers — move the management app from `/org/[orgSlug]/*` to `/[orgSlug]/*`

## Why

The couriers management workspace lives under `/org/<slug>/…`. The `org`
segment carries no meaning for a user — the org slug alone should address the
workspace, the way Slack, Linear and Notion do it. Target:

```
/org/island-logistics/items        →  /island-logistics/items
/org/island-logistics/settings/... →  /island-logistics/settings/...
```

## Scope — `apps/couriers` ONLY

Do not touch `apps/console`, `apps/876`, `apps/enterprise`, `apps/billing`,
`apps/api`, or `packages/**`.

## The move

1. `git mv apps/couriers/src/app/org/[orgSlug]` to
   `apps/couriers/src/app/[orgSlug]`, then remove the now-empty
   `apps/couriers/src/app/org/` directory. Preserve every file, including
   `_components/`, `_lib/`, `loading.tsx`, `layout.tsx`, `not-found.tsx` and
   all tests.
2. Rewrite **every** reference to the old path. There are ~135 occurrences of
   the literal `/org/` across ~74 files. They appear as:
   - template literals: `` `/org/${orgSlug}/items/new` `` → `` `/${orgSlug}/items/new` ``
   - plain strings in `redirect(...)`, `href=`, nav config, `AUTH_RETURN_TO_PARAM`
     values, and route-handler responses
   - test expectations and fixtures
     Search for `'/org/`, `` `/org/ ``, `"/org/`, and `/org/${`. Do **not**
     blanket-replace the bare substring `/org/` — `apps/couriers/src/app/api/**`
     and any FastAPI/SDK path that legitimately contains `organizations` or an
     external `/org/` URL must not be rewritten. Check each hit.
3. Do not rename the `orgSlug` param itself. It stays `[orgSlug]`, and every
   `params: Promise<{ orgSlug: string }>` type stays as-is. This is a path
   change only.

## Reserved slugs — required, not optional

Once `/[orgSlug]` sits at the app root it competes with every static root
segment. Next resolves static segments first, so `/login` keeps working — but an
organization whose slug is `login` becomes permanently unreachable, and any new
root route added later silently shadows an existing workspace.

Current root segments in `apps/couriers/src/app`:

```
access-denied  api  app  auth  callback  get-started  login
manage  no-access  onboarding  portal  register
```

Add `apps/couriers/src/lib/reserved-slugs.ts`:

- Export `RESERVED_ORG_SLUGS`, a `readonly Set<string>` (or frozen array) of
  every segment above, plus `_next`, `favicon.ico`, `robots.txt`,
  `sitemap.xml`, `manifest.json`, `monitoring` (the Sentry `tunnelRoute`), and
  `sw.js`.
- Export `isReservedOrgSlug(slug: string): boolean`, case-insensitive.
- In `apps/couriers/src/app/[orgSlug]/layout.tsx`, call `notFound()` when
  `isReservedOrgSlug(orgSlug)` — **before** any session or tenant lookup, so a
  reserved slug never reaches the database.

Add `apps/couriers/src/lib/reserved-slugs.test.ts` asserting:

- every directory that exists directly under `src/app/` is in the set (read the
  directory listing at test time with `fs.readdirSync` so a **new root route
  added later fails this test** instead of silently shadowing an org);
- `isReservedOrgSlug` is case-insensitive (`'Login'`, `'LOGIN'`);
- a normal slug such as `'island-logistics'` is not reserved.

That directory-reading assertion is the point of the test — do not replace it
with a hardcoded duplicate list.

## Redirects for the old paths

Add a permanent redirect so existing links and bookmarks keep working. In
`apps/couriers/next.config.ts`, add to the existing config:

```ts
async redirects() {
  return [{ source: '/org/:orgSlug/:path*', destination: '/:orgSlug/:path*', permanent: true }]
},
```

Place it beside the existing `headers()`. Do not remove or reorder the existing
`headers()`, `transpilePackages`, `webpack`, or `experimental` entries.

## Constraints

- Follow `.claude/rules/app-structure.md` and `.claude/rules/code-style.md`.
- No behaviour change beyond the path: same guards, same data fetching, same
  auth redirects (their `returnTo` targets just lose the `/org` prefix).
- Do not commit. Do not create branches. Leave the work in the working tree.
- Update every affected test. Do not weaken an assertion to make one pass.

## Verification — run all of these, in the FOREGROUND, and report exit codes

```bash
cd /workspaces/876
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers lint
pnpm --filter @876/couriers test
pnpm prettier --check "apps/couriers/**/*.{ts,tsx}"
grep -rn "/org/" apps/couriers/src | grep -v node_modules
```

The last command is a sweep, not a pass/fail gate: paste its output in your
summary and justify **every** remaining hit.

## Report back

1. Confirmation the directory move preserved history (`git status` should show
   renames, not delete+add).
2. Count of references rewritten, and every `/org/` hit you deliberately left.
3. The reserved-slug list you settled on.
4. Exit code of each verification command.
