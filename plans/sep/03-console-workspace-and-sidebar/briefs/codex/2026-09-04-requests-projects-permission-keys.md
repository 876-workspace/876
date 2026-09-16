# Brief: swap /requests and /projects onto the shared CRM/Projects permission vocabulary (§6.3)

This is a precise, already-designed change — every key mapping below is final.
Apply it exactly; do not invent additional keys or restructure beyond what is
listed.

## Context

Console's `/requests` and `/projects` route subtrees are currently gated by
Console's own disconnected flags, `console:requests` and `console:projects` —
peers of `console:access`, `console:settings`, etc. in the `console` module of
`consolePermissionCatalog` (`packages/core/src/access/catalogs.ts`, the
`defineConsolePermissionCatalog()` function). These flags mean "does this
Console operator's role include the Requests/Projects section" and have
nothing to do with CRM's or Projects' own permission vocabulary.

A prior change in this same branch (already committed — see
`apps/console/src/lib/operator-permissions.ts`) projects every product's own
`AppPermissionCatalog` into a Console namespace: CRM's `requests.view` becomes
`crm/requests.view`, Projects' `dashboard.view` becomes
`projects/dashboard.view`, etc. `.claude/rules/access-control.md`'s stated
principle is "share the vocabulary, never the store" — a Console operator
should be gated by the *same* `<module>.<action>` vocabulary a CRM/Projects
org member is gated by, projected under a Console namespace, not by a second,
disconnected Console-only flag.

Your job: swap the wiring (route guard + nav registry) from the disconnected
Console flag to the real projected product key, and fix every test whose
assertion hard-codes the old value. You are NOT changing
`consolePermissionCatalog` itself — `console:requests` and `console:projects`
remain valid catalog keys, they are simply no longer used to gate these two
routes.

## The exact changes

### 1. `apps/console/src/lib/auth/route-permissions.ts`

```diff
-  '/projects': 'console:projects',
+  '/projects': 'projects/dashboard.view',
   ...
-  '/requests': 'console:requests',
+  '/requests': 'crm/requests.view',
```

Nothing else in this file changes.

### 2. `apps/console/src/components/shell/nav-config.ts`

Every `requires: { permission: 'console:projects' }` **inside the Projects
section** (the `projects` entry and its five children: `projects-overview`,
`projects-projects`, `projects-issues`, `projects-board`, `projects-labels`)
becomes `requires: { permission: 'projects/dashboard.view' }`.

Every `requires: { permission: 'console:requests' }` **inside the Requests
section** (the `requests` entry and its three children: `requests-list`,
`requests-customers`, `requests-forms`) becomes
`requires: { permission: 'crm/requests.view' }`.

Do **not** give the children distinct, more specific keys (e.g. do not use
`crm/customers.view` for `requests-customers`) — every entry in a subtree
uses the same single key as its route's `ROUTE_PERMISSIONS` value, exactly as
today. This preserves the existing "nav entry equals nearest route
permission" binding invariant without requiring new per-child route layouts
(there is currently exactly one `layout.tsx` per subtree, at `/requests` and
`/projects`, not one per child route — do not add any).

Do not touch any other section of `nav-config.ts`.

### 3. `apps/console/src/lib/auth/route-guard.ts`

`requireConsoleCrmPermission` (around line 117) currently does:

```ts
return requireConsolePermission('console:requests')
```

Change the argument to `'crm/requests.view'`. This keeps its behavior
byte-identical to today (previously, seeing `/requests` and mutating CRM data
through this guard both required the same `console:requests` key; now both
require the same `crm/requests.view` key) — it does **not** introduce a
separate view/edit split for CRM mutation routes. That split is real,
deliberate follow-up work, not part of this change; do not attempt it.

Also update the JSDoc comment immediately above the function, which currently
says `Console RBAC permission is therefore the whole authorization decision`
— no wording change needed there, but if the comment quotes the literal string
`'console:requests'` anywhere, update the quoted string to `'crm/requests.view'`
to match. Read the whole docstring before touching it; do not rewrite prose
that does not reference the literal key.

## Tests to fix — read each one before editing

Grep first, in case another test file references these values in a way not
listed here:

```bash
grep -rn "console:requests\|console:projects" apps/console/src/lib/auth apps/console/src/components/shell --include="*.ts" --include="*.tsx"
```

Many hits (in `access-context.*.test.ts`, `guards.comprehensive.test.ts`,
`route-guard.test.ts`) use `'console:requests'` merely as an arbitrary example
string to test generic permission-list plumbing (dedup, sorting, legacy-alias
mapping) — **those are unrelated and must not be touched.** `console:requests`
remains a perfectly valid catalog key; only its use as a *route gate* is
changing. Only touch the files below.

### `apps/console/src/lib/auth/route-permissions.test.ts`

- The `'declares the complete route-enforcement map'` test's hard-coded object
  literal: update `'/projects'` to `'projects/dashboard.view'` and
  `'/requests'` to `'crm/requests.view'`.
- The `'uses only permissions present in the canonical Console catalog'` test
  currently builds its allowed-keys set from `consolePermissionCatalog.permissions`
  alone. That is now wrong for the same reason three other files in this
  branch already needed fixing (see `apps/console/src/lib/permissions.test.ts`
  for the pattern to copy exactly): a route permission may now be a projected
  product key. Rewrite the allowed-keys set to also include every key from
  `operatorProductCatalogs()` in `apps/console/src/lib/operator-permissions.ts`
  (import it), i.e.:

  ```ts
  const catalog = new Set([
    ...consolePermissionCatalog.permissions.map((permission) => permission.key),
    ...operatorProductCatalogs().flatMap((catalog) =>
      catalog.permissions.map((permission) => permission.key)
    ),
  ])
  ```

  (`operatorExclusiveCatalog()` keys are never route permissions — a route is
  never gated by a purge-only key — so do not include it here.)
- `'gives staff the exact guarded route set their cumulative permissions
  allow'` and the admin/super-admin equivalents: **run the test after making
  the changes above and read the actual failure output** — do not guess the
  new expected arrays by hand. `SYSTEM_ROLE_DEFINITIONS` in
  `apps/console/src/lib/permissions.ts` already grants staff and admin every
  product's projected `view`/full keys (`PRODUCT_VIEW`/`PRODUCT_ALL`,
  committed earlier in this branch), so `crm/requests.view` and
  `projects/dashboard.view` should already be held by every role that
  previously held `console:requests`/`console:projects` — the reachable-path
  arrays should come out **unchanged** in content, but verify this by running
  the test rather than asserting it from this brief.

### `apps/console/src/lib/auth/route-permissions.comprehensive.test.ts`

- `'maps /requests to console:requests (not support)'` (around line 10-11):
  rename the test to `'maps /requests to crm/requests.view (not support)'`
  and change the assertion to
  `expect(ROUTE_PERMISSIONS['/requests']).toBe('crm/requests.view')`. Leave
  every other `console:requests` reference in this file untouched — the
  other hits in this file (lines ~39, 57, 72 per the grep above) exercise
  `toStoredPermissionKeys`/effective-permission plumbing with an arbitrary
  example string, unrelated to route gating.

### `apps/console/src/lib/auth/guard-coverage.test.ts`

- Line ~178 asserts `route-guard.ts`'s source **contains**
  `requireConsolePermission('console:requests')` — update the expected
  substring to `requireConsolePermission('crm/requests.view')`.
- Line ~186 asserts the source **does not contain**
  `'console:requests': 'requests` (guarding against an old inline literal
  reappearing) — read what this line is actually checking before touching it;
  if the substring it forbids is specific to the old key spelling, update it
  to the new key spelling with the same intent, not delete the assertion.
- Read the comment around line 23 referencing `console:requests` — update its
  wording only if it explicitly names the literal permission string; otherwise
  leave it.

## Do NOT touch

- `consolePermissionCatalog` itself, or any file under `packages/core/src/access/`.
- Any file matched by the grep above that is not explicitly listed under
  "Tests to fix".
- `apps/console/src/lib/operator-permissions.ts` or `operator-permissions.test.ts`.
- Anything under `apps/console/src/app/(app)/requests/all/` (the Phase 4
  cross-org page — its nav entry/permission is deliberately separate,
  unstarted follow-up work, not part of this change).
- Do not add a view/edit split to `requireConsoleCrmPermission` or to any of
  the API route handlers that call it
  (`apps/console/src/app/api/organizations/[id]/requests/**`).

## Verification (run all, report exact output)

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console exec vitest run src/lib/auth src/components/shell/nav-config.test.ts --maxWorkers=1
node scripts/check-app-structure.mjs
npx prettier --write <every file you changed>
```

Then run the full suite once and report the pass/fail counts (do not hand-fix
anything outside the files listed above if something unrelated fails — report
it instead):

```bash
pnpm --filter @876/console test
```

No `eslint-disable`, `as any`, or `@ts-ignore` anywhere.

## Report

Write `plans/2026-09-03-console-workspace-and-sidebar/reports/codex/2026-09-04-requests-projects-permission-keys.md`
listing every file changed, the exact diff of each test assertion you
updated (not just "updated the test"), and the full verification output.
