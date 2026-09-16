# Brief: Billing navigation registry + Console workspace route binding

Repo root: `/root/projects/876`. Branch: `feature/product-navigation-registries`
(already checked out, cut from `origin/main`). pnpm monorepo, Next.js 16 App
Router, React 19, Vitest 4.

You are implementing two phases. Do Phase 1 completely, then Phase 2. Do not
commit — the orchestrating agent stages and commits.

---

## Required reading before you write anything

- `.claude/rules/access-control.md` — the navigation registry contract.
- `.claude/rules/feature-flags.md` — canonical kebab feature slugs.
- `.claude/rules/testing.md` — the test standard your tests must meet.
- `.claude/rules/ai-code-quality.md` — reuse first, no parallel implementations.
- `packages/core/src/access/navigation.ts` — `defineNavigation` / `resolveNavigation`.
- `apps/invoice/src/components/shell/nav-config.ts` — **the reference
  implementation.** Invoice already did this migration. Match its shape.
- `apps/invoice/src/components/shell/sidebar.tsx` — how a sidebar resolves
  string icon keys and how `mt-auto` is applied to the `secondary` group.
- `apps/invoice/src/components/shell/nav-config.test.ts` — the reference test.
- `apps/invoice/src/app/(app)/layout.tsx` — how a layout resolves navigation.

---

## Phase 1 — Billing navigation onto `defineNavigation`

### The problem

`apps/billing/src/components/shell/nav-config.ts` keeps a hand-rolled
`getVisibleNav` resolver that duplicates `resolveNavigation`, and its `NavItem`
type stores `icon: IconComponent` — a React component inside a structure that
crosses the RSC boundary. `.claude/rules/access-control.md` forbids that
explicitly ("Do not persist React components/functions in a navigation registry
that crosses an RSC boundary"). Every other 876 app already uses the canonical
resolver.

### Two invariants you must preserve exactly

These are behaviours the current code has and the canonical resolver does not
provide. Losing either is a regression.

**(a) Parent/child feature AND.** `getFeatures` currently computes
`quotes: sales && billing-sales-quotes`. In the registry, the `Sales` parent
requires the master slug `billing-sales` and each child requires only its own
child slug. When the master is off, the parent fails its own requirement and
`resolveNavigation` drops the parent _and every child under it_, which reproduces
the AND structurally. Same for `Purchases` / `billing-purchases`. Verify this with
a test; do not re-add a boolean AND in TypeScript.

**(b) Parent-href re-pointing.** Today, `getVisibleNav` re-points a parent's href
to its **first visible child** when the parent's declared href matches a
**declared** child's href:

- `Sales` declares href `/quotes` and has a declared child at `/quotes` → it
  re-points. With quotes off and invoices on, `Sales` lands on `/invoices`.
- `Subscriptions` declares href `/subscriptions` and has **no** declared child at
  `/subscriptions` → it does **not** re-point; it keeps `/subscriptions`.
- `Purchases` declares href `/purchases/vendors` and has a declared child there →
  it re-points.

`resolveNavigation` does not do this. Keep it as an explicit post-pass over the
resolved tree, driven by the **declared** registry (not the visible children).

### What to write

**1. `apps/billing/src/lib/features.ts`**

Add `featureKeys: string[]` to the returned object — the raw canonical enabled
slugs, resolved through the same `hasFeature` legacy-alias helper the booleans
use, so a legacy underscore slug still satisfies a canonical requirement.
Concretely: build `featureKeys` as the list of canonical slug constants in this
file for which `hasFeature(enabledSlugs, slug)` is true. Do not leak raw provider
slugs. On the outage path, `featureKeys` is `[]` (fail closed, matching
`DEFAULT_PRODUCT_FEATURES`).

Add `featureKeys: string[]` to `BillingFeatures` in
`apps/billing/src/types/features.ts`. Leave `BillingProductFeatures` and
`BillingUiFeatures` unchanged — the rest of the app still uses the booleans.

This mirrors Invoice, whose `resolveAccessContext` reads
`(await getFeatures()).featureKeys`.

**2. `apps/billing/src/components/shell/nav-config.ts`**

Replace `Nav`, the `NavItem`/`NavChild`/`NavGroup` types and `getVisibleNav` with:

```ts
export const billingNavigation = defineNavigation([/* groups below */])
export function resolveBillingNavigation(
  context: AccessContext
): NavGroupDefinition[]
```

`resolveBillingNavigation` calls `resolveNavigation(billingNavigation, context)`
and then applies invariant (b) above.

**Leave `BILLING_SETTINGS_SECTIONS` and `getVisibleSettingsSections` exactly as
they are.** They are a different surface and out of scope for this run.

The registry, in this order. Permission keys stay **colon-style** — they are
durable identifiers owned by `billing-api`'s `Member`/`Role` rows and this is a
registry shape change, not a permission migration. Feature keys are the
**canonical kebab slugs** from `apps/billing/src/lib/features.ts`.

Group `workspace` (no label):

| key             | title         | href             | icon key        | color          | requires                                                         |
| --------------- | ------------- | ---------------- | --------------- | -------------- | ---------------------------------------------------------------- |
| `home`          | Home          | `/`              | `dashboard`     | `--876-blue`   | permission `dashboard:read`                                      |
| `customers`     | Customers     | `/customers`     | `customers`     | `--876-gold`   | permission `customers:read`                                      |
| `items`         | Items         | `/items`         | `items`         | `--876-blue`   | permission `catalog:read`                                        |
| `sales`         | Sales         | `/quotes`        | `sales`         | `--876-purple` | permission `sales:read`, feature `billing-sales`                 |
| `subscriptions` | Subscriptions | `/subscriptions` | `subscriptions` | `--876-orange` | permission `subscriptions:read`, feature `billing-subscriptions` |

`sales` children (in order): Quotes `/quotes` feature `billing-sales-quotes`;
Estimates `/estimates` feature `billing-sales-estimates`; Invoices `/invoices`
feature `billing-sales-invoices`; Credit Notes `/credit-notes` feature
`billing-sales-invoices`; Payments Received `/payments` permission `payments:read`.

`subscriptions` children (in order, no requirements): Products `/products`;
Plans `/plans`; Add-ons `/addons`; Prices `/prices`; Coupons `/coupons`;
Price Lists `/price-lists`.

Group `purchases` (no label):

| key         | title     | href                 | icon key    | color        | requires                                                 |
| ----------- | --------- | -------------------- | ----------- | ------------ | -------------------------------------------------------- |
| `purchases` | Purchases | `/purchases/vendors` | `purchases` | `--876-gold` | permission `billing:access`, feature `billing-purchases` |

`purchases` children: Vendors `/purchases/vendors` feature
`billing-purchases-vendors`; Expenses `/purchases/expenses` feature
`billing-purchases-expenses`.

Group `operations` (no label):

| key       | title   | href       | icon key  | color         | requires                                               |
| --------- | ------- | ---------- | --------- | ------------- | ------------------------------------------------------ |
| `banking` | Banking | `/banking` | `banking` | `--876-green` | permission `banking:read`, feature `billing-banking`   |
| `payroll` | Payroll | `/payroll` | `payroll` | `--876-blue`  | permission `billing:access`, feature `billing-payroll` |

Group `secondary` (no label) — the sidebar pins this group with `mt-auto`, keyed
off `group.key === 'secondary'` exactly as Invoice does:

| key        | title    | href        | icon key   | color         | requires                   |
| ---------- | -------- | ----------- | ---------- | ------------- | -------------------------- |
| `reports`  | Reports  | `/reports`  | `reports`  | `--876-green` | permission `reports:read`  |
| `settings` | Settings | `/settings` | `settings` | `--876-blue`  | permission `settings:read` |

Colors use `colorClassName`, in Invoice's form: `'text-[var(--876-blue)]'` etc.
Every child entry needs a unique `key` and an `icon` (`NavEntry.icon` is
required); children are not rendered with icons, so reuse the parent's icon key
for its children rather than inventing new ones.

**3. `apps/billing/src/components/shell/sidebar.tsx`**

Take `navigation: NavGroupDefinition[]` as a prop instead of
`permissions`/`productFeatures`, and drop the `getVisibleNav` call. Add a local
`icons` map from icon key to component, exactly like
`apps/invoice/src/components/shell/sidebar.tsx`. Apply `mt-auto` when
`group.key === 'secondary'`. Key groups by `group.key`.

Icon components to use, all from `@876/ui/icons` (these are the components the
current registry already uses, so the rendered sidebar is unchanged):
`dashboard: BarChart3`, `customers: Users`, `items: CircleStackIcon`,
`sales: ClipboardList`, `subscriptions: RefreshCw`, `purchases: Building2`,
`banking: CreditCard`, `payroll: Users`, `reports: CreditCard`,
`settings: Settings`.

**4. `apps/billing/src/components/shell/nav-dropdown.tsx` and `nav-link.tsx`**

Update to accept a `NavEntry` / the resolved fields. `nav-link.tsx` currently
takes `color` (a raw `var(...)` string) and `icon` (a component); change it to
take `colorClassName` and an already-resolved icon component, matching
`apps/invoice/src/components/shell/nav-link.tsx`. Read that file first and follow
it rather than inventing a third shape.

**5. `apps/billing/src/components/shell/shell.tsx`**

Thread `navigation` through instead of `permissions` + `productFeatures`,
wherever those were being passed only to reach the sidebar. If `permissions` or
`features` are used by the shell for anything else (topbar, widgets), leave those
uses alone.

**6. `apps/billing/src/app/(app)/layout.tsx`**

Build a request `AccessContext` and resolve navigation on the server:

```ts
const navigation = resolveBillingNavigation({
  subject: { userId: sessionUser?.id ?? '' },
  permissions: context.permissions,
  features: features.featureKeys,
  experiments: {},
})
```

Pass `navigation` into `<Shell>`. Do not add a new network call — `context`
(from `getContext()`) and `features` (from `getFeatures(...)`) are already
resolved in this file.

### Phase 1 tests — `apps/billing/src/components/shell/nav-config.test.ts`

Rewrite it against `resolveBillingNavigation`. **At least 12 `it()` cases.**
Follow `.claude/rules/testing.md`: assert exact arrays, not `toBeDefined()`.
Model it on `apps/invoice/src/components/shell/nav-config.test.ts`.

Required cases, at minimum:

1. With every permission and **no** features enabled, the visible entry titles are
   exactly `['Home', 'Customers', 'Items', 'Reports', 'Settings']`.
2. With no permissions at all, the resolved navigation is `[]`.
3. `billing-sales` on, `billing-sales-invoices` on, quotes/estimates off: the
   `Sales` entry's href is `/invoices` and its children are exactly
   `['Invoices', 'Credit Notes']` (parent-href re-pointing, invariant b).
4. `billing-sales` **off** but `billing-sales-quotes` **on**: `Sales` is absent
   entirely — the child does not leak through without its master (invariant a).
5. `billing-subscriptions` on: `Subscriptions` keeps href `/subscriptions` and
   lists all six children in declared order (no re-pointing, invariant b).
6. `billing-purchases` + `billing-purchases-expenses` on, vendors off:
   `Purchases` href is `/purchases/expenses` and its only child is `Expenses`.
7. `Payments Received` appears under `Sales` only when `payments:read` is held.
8. `Banking` requires **both** `banking:read` and `billing-banking` — one test
   per missing half, asserting absence.
9. `Settings` is in a group whose `key` is `secondary` (the `mt-auto` contract
   the sidebar depends on).
10. Every entry's `icon` is a `string` and every entry is JSON-serializable —
    assert `JSON.parse(JSON.stringify(resolved))` equals `resolved` (the RSC
    boundary contract).
11. `resolveBillingNavigation` does not mutate `billingNavigation`: snapshot with
    `structuredClone` before, compare after.
12. Every `requires.permission` in the registry is a member of
    `BILLING_PERMISSION_VALUES` (catalog drift guard).

Keep the existing `getVisibleSettingsSections` test case as-is.

Then **grep the whole repo for `getVisibleNav`** and confirm zero remaining
references outside deleted code.

---

## Phase 2 — Console workspace section ↔ route binding

### The problem

`apps/console/src/features/orgs/app-workspaces.ts` declares sections that have no
route. Verified against the route tree on this branch:

- `billing` declares `items` — `.../workspace/billing/items/` does not exist.
- `invoice` declares `items` — `.../workspace/invoice/items/` does not exist.
- `crm` declares `forms` — `.../workspace/crm/forms/` does not exist.

All three render a sidebar link that 404s.

### What to write

**1. Three placeholder route files**, each modelled exactly on the existing
`apps/console/src/app/(app)/orgs/[slug]/workspace/billing/subscriptions/page.tsx`
(read it first — same `generateMetadata`, same `resolveOrg` + `notFound()`, same
`EmptyWorkspaceView`):

| File                                   | title   | iconKey | description                                             |
| -------------------------------------- | ------- | ------- | ------------------------------------------------------- |
| `.../workspace/billing/items/page.tsx` | `Items` | `items` | `No catalog items exist in this workspace yet.`         |
| `.../workspace/invoice/items/page.tsx` | `Items` | `items` | `No billable items exist in this workspace yet.`        |
| `.../workspace/crm/forms/page.tsx`     | `Forms` | `forms` | `No request forms are published in this workspace yet.` |

Match the relative import depth of `resolveOrg` for each file's own directory
depth — do not copy `'../../../_data'` blindly, count the segments. Metadata
titles follow the existing pattern: `` `${org.name ?? org.slug} • <Title> - <App>` ``
with app names `Billing`, `Invoice`, `CRM`.

Check `EmptyWorkspaceView`'s `iconKey` prop type accepts `items` and `forms`
(they are declared in `WorkspaceIconKey`); if `WorkspaceIcon` has no mapping for
either key, add one using an icon already imported in that component's module —
do not invent a new icon dependency.

**2. `apps/console/src/features/orgs/app-workspaces.test.ts`** — new file.
**At least 6 `it()` cases.** The load-bearing one:

- For every workspace in `APP_WORKSPACES` and every section in it, assert that a
  route file exists at
  `apps/console/src/app/(app)/orgs/[slug]/workspace/<workspace.key>/<section.segment>/page.tsx`
  (and `.../<workspace.key>/page.tsx` for the empty segment). Resolve the path
  from the test file with `node:path` + `node:fs`, walking up to the repo root
  rather than hard-coding an absolute path. A route wrapped in a route group —
  e.g. `crm/requests/(list)/page.tsx` — must count as present, so when the direct
  `page.tsx` is missing, also accept exactly one `(group)/page.tsx` directly
  inside the segment directory. Failure message must name the workspace key, the
  segment, and the path it looked for.

Other cases: `findAppWorkspace` returns the right workspace and `undefined` for
an unknown key; `entitledWorkspaces` filters on `appSlug` and returns `[]` for no
entitlements; `workspaceSectionLinks` builds the exact href list for one
workspace including the index (empty segment → the base path, not a trailing
slash); every workspace `key` and every `appSlug` is unique across the registry.

---

## Hard constraints — read these twice

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** If you need a boundary
  cast use `as unknown as T` and justify it in a comment. A lint gate satisfied
  by a disable comment is a failed delegation and will be rejected.
- **Do not weaken production code to make a test easier** — no loosening a prop
  to optional, no exporting internals purely for a test.
- **Do not write a test that cannot fail.** No `expect(x).toBeDefined()` as the
  only assertion. Assert exact arrays and exact strings.
- **Do not rename any permission key.** `billing:access`, `customers:read` and
  the rest are durable persisted identifiers.
- **Do not touch** `packages/core/src/access/navigation.ts`, any file under
  `apps/invoice/`, `apps/crm/`, `apps/couriers/`, `packages/billing/`,
  `scripts/shared-ui-packages.mjs`, or anything under `plans/`.
- **Do not create a `packages/billing-ui` package.** Out of scope.
- **Do not commit, branch, rebase, or push.** Leave changes in the working tree.
- **No narrative comments.** Comments explain _why_ — an invariant, a constraint,
  a non-obvious failure mode — never what the next line does
  (`.claude/rules/ai-code-quality.md`).
- Follow `.claude/rules/code-style.md`: single-statement `if` bodies drop their
  braces; blank lines separate logical concern groups.

## Verification you must run yourself before reporting done

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

The console suite is slow; let it finish. If a command fails, fix the cause — do
not report done with a red gate, and do not silence it.

## Report

Write your report to
`plans/2026-09-02-product-navigation-registries/reports/codex/2026-09-02-billing-nav-registry-and-console-route-binding.md`
containing:

- a per-phase status table with the **counted** number of `it()` cases you added
  in each file (count them, do not estimate);
- every file changed, with one line on why;
- the exact output status of each verification command above;
- anything you could not do, and why — a truthful "not done" is worth more than a
  confident claim;
- any decision the brief did not settle.
