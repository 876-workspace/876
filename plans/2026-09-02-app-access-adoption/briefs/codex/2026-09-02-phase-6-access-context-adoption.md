# Phase 6 — one AccessContext per request in CRM and Invoice

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876`. **Branch:** `feature/app-access-adoption`. Do not create, switch, merge, rebase, or delete any branch. **Do not commit.**

**Dispatch only after Phase 4 has landed and been committed** — it touches the same
CRM and Invoice trees.

## Why

`@876/core/access` already owns the whole model — `AccessContext`, `can`,
`hasFeature`, `variantOf`, `groupByModule`, `resolveEffectivePermissions` — and
**only Console consumes it.** CRM and Invoice still gate on a normalized
organization role, so "what may this member actually do in this app, which
navigation should render, which features are on" is answered properly in one of
four surfaces.

Everything needed now exists: catalogs for all four product apps, seeded role
templates, effective permissions resolving fail-closed in Core, and a session
endpoint that returns them per member per app.

**Billing is deliberately out of scope.** Its authorization plane is being replaced
wholesale in Phase 5; doing it here would mean doing it twice.

## Read first (binding)

- `.claude/rules/access-control.md` — **the whole file.** The three enforcement layers, the binding rule, permission vs feature vs experiment, and the fail-closed/fail-open direction.
- `.claude/rules/access-tiers.md` — session authority.
- `.claude/rules/navigation-performance.md` **Rule 3** — a guard cannot stream, so it must be cheap; memoize and watch `React.cache` argument identity.
- `.claude/rules/sdk-conventions.md`, `.claude/rules/app-structure.md`, `.claude/rules/error-handling.md`.

## Reference implementation

`apps/console/src/lib/auth/access-context.ts` and
`apps/console/src/components/shell/nav-config.ts`. Read both. **Do not modify
anything under `apps/console/`.**

Console's resolver shows the two behaviours that matter and must be carried across:

- it is memoized with `React.cache` on a **primitive** argument, because
  `React.cache` compares with `Object.is` and an inline `{ userId }` would never hit;
- **permissions fail closed, features fail soft.** A feature-provider outage
  disables features without discarding otherwise valid permissions, and the reason
  is written in a comment. Reproduce that split and that comment.

## Verified contracts — build on these

The acting member's own effective permissions for one app come from a
purpose-built session endpoint:

```
GET /organizations/{organizationId}/apps/{appId}/members/me
```

exposed as `$876.appMemberships.me.retrieve({ organizationId, appId })` in
`@876/account`, returning an app-membership object whose `effective_permissions`
is `(role ∪ grants − denies) ∩ live catalog`, already resolved and already fail
closed by the API.

**Neither CRM nor Invoice has an `@876/account` client today** — they have
`services/platform.ts` and `services/workspace.ts` only. Add one.

Do **not** reach for `workspace.appMemberships.list(orgId, { userId })` instead.
That is the organization-wide resource; asking it for your own row is the wrong
question and a wider authority than a self read needs.

Catalogs: `appPermissionCatalogs['876-crm']` and `appPermissionCatalogs['876-invoice']`
from `@876/core/access/catalogs`.

CRM's existing `apps/crm/src/lib/auth/app-access.ts` resolves the **organization**
permissions (`apps:assign`, `members:read`) that govern member management. That is a
different plane and stays exactly as it is — an app permission never grants
`apps:assign`, and an organization permission never grants an in-app capability.
Do not merge the two.

## Scope

### 1. An account client per app

`apps/crm/src/lib/services/account.ts` and `apps/invoice/src/lib/services/account.ts`.

Request-scoped, mirroring each app's existing `services/workspace.ts`: read the
session, redirect to `/login` when unsigned, and construct the client with the
app's own key (`CRM_API_876_KEY`, `INVOICE_API_876_KEY`) and the session access
token. Never a module singleton — the access token belongs to one request.

Add `@876/account` to `apps/invoice/package.json` if absent; CRM already has it.

### 2. `src/lib/auth/access-context.ts` per app

```ts
export const resolveAccessContext = cache(async function resolveAccessContext(
  userId: string,
  organizationId: string
): Promise<AccessContext | null>
```

Two **primitive** arguments — never an options object.

- Resolve `$876.appMemberships.me.retrieve({ organizationId, appId })` for that
  app's platform app id/slug. On error or a revoked/inactive membership, return a
  context with `permissions: []` rather than throwing — absence of permission is
  the fail-closed answer, not a crash.
- `permissions` are the returned `effective_permissions`. The API already
  intersected them with the live catalog; do not re-derive them locally.
- `features` come from the app's existing `src/lib/features.ts`, wrapped so a
  provider outage yields `[]` and leaves permissions intact. Carry Console's
  comment explaining why that direction is correct.
- `experiments: {}` with the same TODO Console carries. Experiments are
  presentation-only and must never authorize.

Also export thin helpers over `can` / `hasFeature` from `@876/core/access` so pages
do not re-implement the check.

### 3. Guards

Add `requireAppPermission(permission: string)` beside each app's existing guards:
resolve the context, and when the permission is absent, render the app's existing
no-access route rather than throwing. Follow how each app already handles a denied
page today — read `apps/crm/src/lib/auth/require-crm-context.ts` and Invoice's
equivalent instead of inventing a pattern.

For a **route handler**, denial is a 403 **value**, never a redirect — CRM's
`requireAppAccessManager` is the shape to follow.

### 4. Navigation gating

Declare each app's sidebar with `defineNavigation` from `@876/core/access`, giving
every entry that needs one a `requires: { permission }` (and `feature` where a
rollout flag genuinely gates it — ANDed, per `access-control.md`).

Resolve and filter navigation **on the server** with the request's context, then
pass plain data to the client shell. The registry must stay structurally
cloneable: **string icon keys, never components or functions.**

Do not ship the full registry to the browser and filter it there.

### 5. The binding test — this is the point of the phase

Per `.claude/rules/access-control.md`, add a test per app that walks the navigation
registry and asserts **every entry's `requires.permission` equals the permission
its destination route (or nearest gating layout) checks.** When it fails, the fix
is the route or the registry — never a weakened test.

Also assert: a permission a nav entry requires is granted by at least one seeded
role. A permission no role grants is indistinguishable from one that does not exist.

## Tests — at least 34 `it()` across both apps

- **Resolver** (≥10 per app): permissions come from `effective_permissions` unchanged; an error returns `permissions: []` rather than throwing; a revoked membership yields no permissions; a feature-provider failure yields `features: []` **and keeps permissions**; `experiments` is empty; memoization holds across two calls with the same primitives (assert the client was called once); a different organization id resolves separately.
- **Guards** (≥6): a held permission admits; a missing one denies; a route-handler denial is a 403 value, not a redirect; denial does not leak a provider message.
- **Navigation** (≥8): exact visible href sets for a permission-rich and a permission-poor subject; an entry whose permission is absent is removed; a parent with no visible children is removed; permission AND feature both required; the registry output is structurally cloneable (`structuredClone` round-trip); resolving does not mutate the registry.
- **Binding** (≥2 per app): registry-to-route binding; every required permission is granted by some seeded role.

Assert exact call counts and exact arguments. Assert both sides of every
`{ data, error }`.

Invoice runs vitest on `environment: 'node'` — every `.test.tsx` there needs a
`// @vitest-environment jsdom` docblock or it silently never runs.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.**
- Do not merge the organization-permission plane with the app-permission plane.
- Do not use a feature flag as a permission, or an experiment to authorize anything.
- Do not make navigation hiding the security boundary — the route guard is.
- Do not modify `apps/console/`, `apps/billing/`, `apps/api/`, `packages/core`, or `apps/crm/src/lib/auth/app-access.ts`.
- Do not run `git commit`, `git push`, or any branch operation.

## Verification

```bash
pnpm --filter @876/crm-app typecheck && pnpm --filter @876/crm-app test && pnpm --filter @876/crm-app lint
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

## Report

`plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-6-access-context-adoption.md`
— file table, counted `it()` per file, verification tails, judgement calls,
anything you could not do, and anything contradicting this brief.
