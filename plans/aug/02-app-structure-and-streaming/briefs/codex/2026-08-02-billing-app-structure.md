# Brief — Phase 3: restructure `apps/billing` onto the app-structure model

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Scope:** `apps/billing/**` only. Do **not** touch any other app or package.

## Read first (mandatory, in this order)

1. `.claude/rules/app-structure.md` — **the specification.** Where this brief
   and that rule appear to disagree, the rule wins; say so in your report.
2. `apps/console/src/` — **the reference implementation.** Phase 2 already
   restructured Console exactly this way. Match its shape: look at
   `apps/console/src/components/{shell,providers,patterns}`,
   `apps/console/src/features/<domain>/`, and any
   `apps/console/src/app/**/_components/` directory before you start.
3. `.claude/rules/code-style.md` and `.claude/rules/types.md`.

## What this is

`apps/billing/src/components/` is **65 files in a single flat directory with
zero subdirectories** — the worst instance of this problem in the repo. There
are also ~25 non-route files sitting as bare siblings of `page.tsx` under
`src/app/`.

**This is a move, re-import and rename refactor. Zero behavior change.** Files
move, and `Billing`-prefixed symbols lose that prefix (see the next section).
Do **not** change a prop, alter JSX, restructure logic, or fix an unrelated bug
you notice. Report anything suspicious instead of changing it.

## Naming: drop the `billing-` prefix everywhere

The path already says `apps/billing`. Every file currently named
`billing-*.tsx` loses that prefix when it moves (`billing-sidebar.tsx` →
`shell/sidebar.tsx`, `billing-permission-picker.tsx` →
`features/access/components/permission-picker.tsx`).

**Exported symbol names lose the prefix too.** `BillingSidebar` → `Sidebar`,
`BillingUserMenu` → `UserMenu`, `BillingShellUser` → `ShellUser`,
`BillingNavItem` → `NavItem`, and so on. Rename every reference, including
string literals inside `vi.mock('./billing-nav-link')`-style test mocks.

**When dropping the prefix collides with a `@876/ui` export, alias the
imported primitive — never re-prefix the local component:**

```tsx
import { Sidebar as SidebarRoot, SidebarContent } from '@876/ui/sidebar'

export function Sidebar() {
  return <SidebarRoot>…</SidebarRoot>
}
```

Two exceptions that keep their names:

- `src/lib/billing-app.ts` — it names the app as data.
- Anything under `src/lib/` or `src/types/` (`BillingErrorCode`, `BillingUser`,
  …). Those are out of scope for this phase; leave them alone.

## Target placement — every one of the 65 files

### `components/shell/`

`billing-shell` → `shell`, `billing-sidebar` → `sidebar`,
`billing-nav-config`(+test) → `nav-config`, `billing-nav-dropdown` →
`nav-dropdown`, `billing-nav-link` → `nav-link`, `billing-topbar-actions` →
`topbar-actions`, `billing-topbar-search` → `topbar-search`,
`billing-user-menu`(+test) → `user-menu`, `billing-org-switcher`(+test) →
`org-switcher`.

### `components/providers/`

`focus-revalidate.tsx` — it is mounted in `src/app/layout.tsx` as app-wide
behavior.

### `components/patterns/`

- `metric-card.tsx`, `resource-row-link.tsx`
- `billing-create-form.tsx`(+test) → `patterns/create-form.tsx`(+test).
  **It is domain-agnostic**: it exports `CreateForm` and is consumed by items,
  customers, price-lists, plans, products and addons routes. It is not a
  catalog component — do not file it under a feature.
- `patterns/detail/` cluster: `detail-accordion.tsx`, `detail-action-list.tsx`,
  `detail-field.tsx`, `detail-layout.tsx` (names unchanged inside the cluster).

### `features/`

| Feature         | Files (current names in `src/components/`)                                                                                                                                                                                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `access`        | `billing-permission-picker`(+test), `billing-role-create-form`, `billing-role-editor`, `billing-members-table`                                                                                                                                                                                                                                                                 |
| `catalog`       | `catalog-price-draft.ts`(+test), `catalog-resource-actions`, `price-create-form`, `price-list-create-form`, `price-tier-editor`, `addon-association-manager`, `addon-create-form`                                                                                                                                                                                              |
| `coupons`       | `coupon-create-form`, `coupon-edit-form`                                                                                                                                                                                                                                                                                                                                       |
| `documents`     | `document-create-form`, `document-create-model.ts`(+test), `document-line-editor`, `document-lines`                                                                                                                                                                                                                                                                            |
| `subscriptions` | `subscription-amendment-form`, `subscription-billing-item-action`, `subscription-bulk-invoice-form`, `subscription-charge-form`, `subscription-create-form`, `subscription-detail-actions`, `subscription-discount-form`, `subscription-invoice-actions`, `subscription-lifecycle-form`, `subscription-preference-form`, `subscription-status-badge`, `subscription-view-form` |
| `payments`      | `payment-form`, `payment-mode-form`                                                                                                                                                                                                                                                                                                                                            |
| `banking`       | `bank-account-form`, `bank-transaction-form`                                                                                                                                                                                                                                                                                                                                   |
| `settings`      | `billing-engine-settings-forms`, `currency-settings`, `tax-authority-settings`, `tax-rate-settings`, `invoice-preference-form`, `customer-invoice-preference-form`                                                                                                                                                                                                             |

Within a feature: **components go in `features/<x>/components/`; pure
non-JSX modules go at the feature root.** So `catalog-price-draft.ts` and its
test go to `features/catalog/catalog-price-draft.ts`, and
`document-create-model.ts` and its test go to
`features/documents/document-create-model.ts` — not into `components/`.

Do **not** create `types.ts`, `utils.ts`, `hooks/` or `constants.ts` in any
feature unless you are moving an existing file into it.

### Route colocation — `_components/` and `_lib/`

Same rule as Console. For every directory under `src/app/`:

- renders JSX / exports a React component → sibling `_components/`
- pure helper, no JSX → sibling `_lib/`
- a `*.test.ts(x)` moves into the same folder as its subject
- existing `_data.ts` files stay put
- `src/app/api/**` is out of scope — leave `route.ts`, `route.test.ts` and any
  route-handler helper exactly where they are
- Next.js special files stay: `page.tsx`, `layout.tsx`, `loading.tsx`,
  `error.tsx`, `global-error.tsx`, `not-found.tsx`, `manifest.ts`,
  `sitemap.ts`, `opengraph-image.tsx`
- a nested route gets its **own** `_components/` — never move a file up into a
  parent's or sideways into a sibling's. If two sibling routes genuinely share
  a component, put it in the right `features/<domain>/components/` and say so
  in your report.

Note billing uses route groups heavily (`(app)`, `(invoicing)`, `(catalog)`,
`(subscription-management)`). A route group directory is a real directory and
can hold its own `_components/`; treat it like any other.

## Hard constraints

- **No barrel `index.ts` anywhere.** One barrel means the task failed.
- `@/` alias for imports outside the current route subtree; relative
  (`./_components/foo`) within it.
- No JSX may enter `src/lib/`.
- Do not modify `src/lib/`, `src/types/`, `src/test/`, `prisma/`, or any config
  file in this phase.
- Do not add, remove or reorder a dependency.
- **Do not run `git commit`, `git add`, `git checkout`, `git stash`, or
  `git rebase`.** Leave everything unstaged; the orchestrating agent commits.
- Move files with **`git mv`** so rename detection survives, then fix imports.

## Verification — all must pass before reporting done

```bash
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app test
pnpm --filter @876/billing-app lint
```

Structural invariants — each must print **nothing**:

```bash
find apps/billing/src/app -name '*.tsx' \
  ! -path '*/_components/*' ! -path '*/_lib/*' \
  ! -name 'page.tsx' ! -name 'layout.tsx' ! -name 'loading.tsx' \
  ! -name 'error.tsx' ! -name 'not-found.tsx' ! -name 'global-error.tsx'

find apps/billing/src/components apps/billing/src/features -name 'index.ts*'

find apps/billing/src/components apps/billing/src/features -name 'billing-*'

grep -rn 'Billing[A-Z]' apps/billing/src/components apps/billing/src/features

grep -rn '@/features/' apps/billing/src/components

find apps/billing/src/components -maxdepth 1 -type f
```

The last one matters: after this phase **no file may sit directly in
`src/components/`** — everything is in `shell/`, `providers/` or `patterns/`.

If a check fails, fix it and re-run. Do not report success on a red check.

## Report back

1. Table of every file moved: old path → new path.
2. Count of import statements rewritten.
3. Verbatim output of the three verification commands and the four invariants.
4. Any deviation from this brief, and why.
5. Anything that looked like a pre-existing bug — **described, not fixed**.
