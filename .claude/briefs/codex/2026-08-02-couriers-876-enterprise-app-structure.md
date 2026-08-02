# Brief — Phase 4: restructure `apps/couriers`, `apps/876`, `apps/enterprise`

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Scope:** `apps/couriers/**`, `apps/876/**`, `apps/enterprise/**`. Nothing else
— not `apps/console`, not `apps/billing`, not any package.

## Read first (mandatory)

1. `.claude/rules/app-structure.md` — **the specification.** Where this brief
   and the rule disagree, the rule wins; say so in your report.
2. `apps/console/src/` — **the reference implementation**, already merged.
   Match its shape exactly: `components/{shell,providers,patterns}`,
   `features/<domain>/{components,<pure>.ts}`, `app/**/_components/`, `_lib/`.
3. `.claude/rules/code-style.md`, `.claude/rules/types.md`.

## What this is

Three apps still carry the old layout. They are much smaller than Console and
Billing, so this is one pass across all three.

**This is a move, re-import and rename refactor. Zero behavior change.** Do not
change a prop, alter JSX, restructure logic, or fix an unrelated bug. Report
anything suspicious instead of changing it.

## Naming — drop the app-name prefix, on files _and_ symbols

`couriers-sidebar.tsx` → `shell/sidebar.tsx`, and `CouriersSidebar` →
`Sidebar`. Same for `Enterprise*`. The path already names the app.

**When dropping the prefix collides with a `@876/ui` export, alias the imported
primitive — never re-prefix the local component:**

```tsx
import { Sidebar as SidebarRoot, SidebarContent } from '@876/ui/sidebar'

export function Sidebar() {
  return <SidebarRoot>…</SidebarRoot>
}
```

Update string literals in test mocks (`vi.mock('./couriers-nav-link')`) too.

**Out of scope for renaming:** anything under `src/lib/` or `src/types/`
(`CouriersUser`, `<app>-app.ts`, `couriers-nav-path.ts` if it lives in lib).
Leave those names alone.

---

## `apps/couriers`

### `components/shell/`

`couriers-shell` → `shell`, `couriers-sidebar`(+test) → `sidebar`,
`couriers-topbar`(+test) → `topbar`, `couriers-nav-config` → `nav-config`,
`couriers-nav-dropdown` → `nav-dropdown`, `couriers-nav-link`(+test) →
`nav-link`, `couriers-nav-path.ts` → `nav-path.ts`,
`switch-account-link.tsx` → `switch-account-link.tsx`.

### `components/patterns/`

`address-fields.tsx`(+test).

### `features/portal/`

The whole `components/portal/` directory is the customer-portal surface — a
real product domain used by several routes. Move it to
`features/portal/components/`, dropping the redundant `portal-` prefix on
files that carry it (`portal-header.tsx` → `header.tsx`, `portal-nav.tsx` →
`nav.tsx`, `portal-account-menu.tsx` → `account-menu.tsx`); keep
`copyable-address-line`, `package-list`, `package-status-badge`,
`package-timeline`, `embedded-auth` as-is.

### Route colocation

`src/app/providers.tsx` and `src/app/service-worker-registration.tsx` →
`components/providers/`. Everything else non-route under `src/app/` goes into a
sibling `_components/` (JSX) or `_lib/` (no JSX — e.g.
`settings/orgprofile/field-spec.ts`, `settings/settings-groups.ts`,
`settings/users/member-initials.ts`).

**Watch for cross-subtree sharing.** `org/[orgSlug]/settings/**` is a large
subtree; a descendant importing an ancestor's `_components/` is **fine**, but
if two _sibling_ subtrees need the same component it must go to
`features/<domain>/components/` instead. Report every such case.

`login/embedded-auth.tsx` and `manage/login/embedded-auth.tsx` are two
different files for two different login surfaces — keep them separate, one
`_components/` each. Do **not** deduplicate them.

---

## `apps/876`

### `components/patterns/`

`screen.tsx`.

### `features/account/`

`components/account/account-page.tsx` and `account-shell.tsx` →
`features/account/components/`.

### `components/providers/`

Already correct (`theme-provider.tsx`, `user-store-provider.tsx`). Add
`src/app/providers.tsx` and `src/app/serwist.tsx` to it.

### `components/icons/` — LEAVE ENTIRELY ALONE

All 11 files are unreferenced dead code pending a separate deletion decision.
**Do not move, rename, delete or re-import them.**

### Route colocation

Non-route files → sibling `_components/`. `src/app/logout-button.tsx` →
`src/app/_components/logout-button.tsx`.

**Next.js special files stay exactly where they are:** `opengraph-image.tsx`,
`robots.ts`, `sw.ts`, `manifest.ts`.

---

## `apps/enterprise`

### `components/shell/`

`components/enterprise/*` → `components/shell/`, dropping the prefix:
`enterprise-shell` → `shell`, `enterprise-sidebar` → `sidebar`,
`enterprise-nav-link`(+test) → `nav-link`, `enterprise-apps-group` →
`apps-group`. The `components/enterprise/` directory disappears.

### `components/patterns/`

`error-state.tsx`.

### Route colocation

Everything non-route under `src/app/` → sibling `_components/` /
`_lib/` (`[slug]/organization/organization-sections.ts` is pure → `_lib/`).

---

## Hard constraints

- **No barrel `index.ts` anywhere.**
- `@/` alias outside the current route subtree; relative within it.
- Never import sideways into another subtree's `_components/`.
- `components/` must never import from `features/`.
- No JSX in `src/lib/`.
- Do not touch `src/lib/`, `src/types/`, `src/stores/`, `src/test/`, `prisma/`,
  or any config file.
- Do not add, remove or reorder a dependency.
- **Do not run `git commit`, `git add`, `git checkout`, `git stash` or
  `git rebase`.** Leave everything unstaged.
- Move with **`git mv`** so renames are detected, then fix imports.

## Verification — all must pass

```bash
pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test && pnpm --filter @876/couriers lint
pnpm --filter @876/app typecheck && pnpm --filter @876/app test && pnpm --filter @876/app lint
pnpm --filter @876/enterprise typecheck && pnpm --filter @876/enterprise test && pnpm --filter @876/enterprise lint
```

Structural invariants — each must print **nothing**:

```bash
for a in couriers 876 enterprise; do
  find apps/$a/src/app -name '*.tsx' \
    ! -path '*/_components/*' ! -path '*/_lib/*' \
    ! -name 'page.tsx' ! -name 'layout.tsx' ! -name 'loading.tsx' \
    ! -name 'error.tsx' ! -name 'not-found.tsx' ! -name 'global-error.tsx' \
    ! -name 'opengraph-image.tsx' ! -name 'template.tsx' ! -name 'default.tsx'
  find apps/$a/src/components apps/$a/src/features -name 'index.ts*'
  grep -rn '@/features/' apps/$a/src/components
done
find apps/couriers/src/components apps/couriers/src/features -name 'couriers-*'
find apps/enterprise/src/components apps/enterprise/src/features -name 'enterprise-*'
grep -rn '\bCouriers[A-Z]' apps/couriers/src/components apps/couriers/src/features
grep -rn '\bEnterprise[A-Z]' apps/enterprise/src/components apps/enterprise/src/features
```

Note `apps/876/src/app/opengraph-image.tsx` is deliberately excluded — it is a
Next.js special file.

If a check fails, fix it and re-run. Do not report success on a red check.

## Report back

1. Table of every file moved: old path → new path, grouped by app.
2. Every symbol renamed.
3. Verbatim output of the nine verification commands and every invariant.
4. Any cross-subtree sharing you found and how you resolved it.
5. Any deviation from this brief, and why.
6. Anything that looked like a pre-existing bug — **described, not fixed**.
