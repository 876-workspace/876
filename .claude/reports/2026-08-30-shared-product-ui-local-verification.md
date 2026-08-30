# Local verification & gap closure — PR #442

Companion to `.claude/reports/gpt-web/2026-08-30-shared-product-ui-surfaces.md`,
which was written without a runnable checkout and correctly declined to claim
any check green. This is the record of the checks actually executing, and of
what they found.

## Branch state

`feature/shared-product-ui-surfaces` at `94f1ada5` is **0 commits behind
`origin/main`** (`ae167cea`). No rebase or merge was needed.

Every GitHub Actions check on the PR is red, in 2–3 seconds, with zero steps
executed. That is the repository-wide Actions outage, not this branch — the
workflows are currently disabled. Verification below is local.

## Gaps found and closed

### 1. Missing lockfile entries (build-blocking)

`pnpm-lock.yaml` had no `packages/crm-ui` or `packages/work-ui` importers, so
`pnpm install --frozen-lockfile` — what CI and every Cloudflare Workers build
run — could not resolve the new workspace packages.

Regenerated: `+67 / -14` lines, confined to the two new importers and the two
apps that depend on them.

### 2. Shared UI packages were not transpiled (runtime-breaking)

**This is the defect that broke Console's CRM workspace in dev.** Neither
`@876/crm-ui` nor `@876/work-ui` was listed in any app's
`transpilePackages`. Both ship raw `.tsx`, so their client components resolved
to `undefined` at render:

```
Element type is invalid. Received a promise that resolves to: undefined.
Lazy element type must resolve to a class or function.
  at CrmWorkspaceCustomerLayout (…/workspace/crm/customers/[customerId]/layout.tsx:51)
```

It reached a browser rather than a build error because nothing checks the list.
`@876/work-ui` was the wider exposure: `@876/ui` now delegates three surfaces to
it, so **every** app was affected, not only the two CRM hosts.

Fixed structurally rather than per app. `scripts/shared-ui-packages.mjs` owns the
canonical list; all seven Next apps now build their config from it:

```ts
transpilePackages: sharedTranspilePackages(['@876/sdk', '@876/core']),
```

`scripts/check-shared-ui-transpile.mjs` (`pnpm check:transpile`, wired into the
app-structure workflow) fails the build if an app hand-writes the list or
duplicates a shared entry.

This is what makes the surfaces auto-sync: a new product-UI package added to
`SHARED_UI_PACKAGES` reaches every existing app and every future one — careers,
events — with no per-app edit.

### 3. Two mutating routes outside the guard inventory

`guard-coverage.test.ts` failed: the new
`organizations/[id]/requests/[requestId]/events{,/[eventId]}` routes were not in
`CRM_REQUEST_MUTATION_GUARDS`. Both routes did carry
`requireConsoleCrmPermission`, and `events.create|edit|delete` do exist in the
CRM catalog (`packages/core/src/access/catalogs.ts:188`) — the inventory had
simply not been extended, which is exactly what that test exists to catch.

Added; the suite's dual-gate assertions now cover both routes.

### 4. App-name symbol prefix

`ConsoleCustomerCard` violated the no-app-name-prefix rule
(`.claude/rules/app-structure.md`). Renamed to `CustomerCard`; no collision,
since the shared primitive it wraps is `CustomerCardFrame`.

### 5. Console CRM customers had no list/detail shell

Standalone CRM renders `/customers/*` through `CustomersShell` →
`ListDetailShell`. Console had the `(list)` route group that exists to make the
same layout possible, but no `customers/layout.tsx` — so a customer record
rendered alone in the content area instead of beside the list. Fixed by
promoting the shell to `@876/crm-ui/customer-list-shell` and adopting it in both
hosts.

### 6. The pattern was undocumented

Added `.claude/rules/shared-product-ui.md` (mirrored to `.agents/rules/`) and a
pointer in `CLAUDE.md`: what a `@876/<product>-ui` package owns, what it must
never own (routes, data, authorization, mutations, host branching), the shared
transpile list, and the procedure for adding a host or a new product app.

## Architecture assessment

The direction is sound and matches the platform's existing boundaries.

- Presentation lives in the product package; routing, data, authorization and
  mutations stay with the host. Audited: no path literal, no `$876`, no `fetch`,
  no session or permission read, and no `apps/` import in either package.
- Host-only affordances are explicit props (`newCustomerHref`, `actions`, the
  tab subset), not host-name conditionals.
- Console reaches CRM at the **operator tier** through
  `createConsole876Client`, under Console-vocabulary routes
  (`/api/organizations/[id]/requests/…`) — consistent with `access-tiers.md`
  and `app-api-routing.md`. It holds no integration credential.
- Moved `@876/ui` entry points remain as one-line delegates, so there is one
  implementation and no caller churn.
- Console's floating/collapsible workspace rail stays Console-owned in
  `WorkspaceShell`, with regression coverage; the shared surface fills only the
  content area.

## Verification executed

| Command                                      | Result                        |
| -------------------------------------------- | ----------------------------- |
| `pnpm install --lockfile-only`               | lockfile regenerated, +67/−14 |
| `pnpm --filter @876/work-ui typecheck`       | pass                          |
| `pnpm --filter @876/crm-ui typecheck`        | pass                          |
| `pnpm --filter @876/ui typecheck`            | pass                          |
| `pnpm --filter @876/crm-app typecheck`       | pass                          |
| `pnpm --filter @876/console typecheck`       | pass                          |
| `pnpm --filter @876/ui test`                 | 110 passed / 17 files         |
| `node scripts/check-app-structure.mjs`       | OK                            |
| `node scripts/check-shared-ui-transpile.mjs` | OK                            |

Console and CRM suites, and the final typechecks, were re-run after the
list/detail shell change; counts are in the PR description.

No `eslint-disable` and no `as any` were introduced (`grep` over every touched
path). No schema or migration changes.
