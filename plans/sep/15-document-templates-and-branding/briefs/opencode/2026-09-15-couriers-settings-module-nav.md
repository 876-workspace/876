# Brief: Couriers settings — modules as sidebar items, remove the modules index and the "Settings" back link

Working directory: `/root/projects/876-invoice-branding` (a git worktree). Branch `feat/couriers-settings-module-nav` is already checked out. **Do not commit, do not switch branches, do not create worktrees.**

## Read budget

Read ONLY these files, then start writing. Everything else you need is pasted below.

1. `apps/couriers/src/components/shell/settings-nav.ts`
2. `apps/couriers/src/components/shell/settings-nav.test.ts`
3. `apps/couriers/src/components/shell/nav-icons.tsx`
4. `apps/couriers/src/lib/modules/catalog.ts`

## Task 1 — replace the single "Modules" sidebar entry with a "Modules" group

In `settings-nav.ts` (`SETTINGS_NAV_GROUPS`):

- Delete the `{ key: 'modules', title: 'Modules', href: '/settings/modules', icon: 'modules' }` entry from the `product` group.
- Delete the `{ key: 'portal', title: 'Customer portal', href: '/settings/portal', ... }` entry from the `product` group (it moves into the Modules group below, so the rail never shows "Customer portal" twice).
- Add a new group **between `organization` and `product`**:

```ts
{
  key: 'modules',
  label: 'Modules',
  entries: [
    { key: 'module-items', title: 'Items', href: '/settings/modules/items', icon: 'module-items' },
    { key: 'module-warehouse', title: 'Warehouse', href: '/settings/modules/warehouse', icon: 'module-warehouse' },
    { key: 'module-manifests', title: 'Manifests', href: '/settings/modules/manifests', icon: 'module-manifests' },
    { key: 'module-deliveries', title: 'Deliveries', href: '/settings/modules/deliveries', icon: 'module-deliveries' },
    { key: 'module-invoices', title: 'Invoices', href: '/settings/modules/invoices', icon: 'module-invoices' },
    { key: 'module-payments', title: 'Payments', href: '/settings/modules/payments', icon: 'module-payments' },
    { key: 'module-portal', title: 'Customer portal', href: '/settings/modules/portal', icon: 'module-portal' },
  ],
},
```

The catalog (`COURIERS_MODULE_CATALOG`) module keys are, in order: `general`, `items`, `warehouse`, `manifests`, `deliveries`, `invoices`, `payments`, `portal`. **`general` is intentionally excluded** from the sidebar (the user asked for the general modules settings to be removed). Keep the list literal (hand-maintained) — do not `.map()` over the catalog in `settings-nav.ts`.

In `nav-icons.tsx`: remove the `modules` key, and add the seven `module-*` keys. Pick icons that already exist in `@876/ui/icons`. Verify every name you import exists with:

```bash
grep -n "export" packages/ui/src/icons.ts* | grep -o "[A-Z][A-Za-z0-9]*Icon" | sort -u | grep -i "cube\|archive\|clipboard\|truck\|document\|banknote\|window\|building\|queue\|list"
```

(If `packages/ui/src/icons.ts*` does not match, run `grep -n '"./icons"' -A3 packages/ui/package.json` to find the file.) Reuse `WindowIcon` for `module-portal`. Do not add a dependency.

## Task 2 — delete the modules index page

Delete these two files:

- `apps/couriers/src/app/[orgSlug]/settings/modules/page.tsx`
- `apps/couriers/src/app/[orgSlug]/settings/modules/page.test.tsx`

Keep `modules/[moduleKey]/page.tsx`.

## Task 3 — remove the "← Settings" back link from every settings page

Every page under `apps/couriers/src/app/[orgSlug]/settings/` renders:

```tsx
<PageBreadcrumb
  href={`/${orgSlug}/settings`}
  label="Settings"
  className="mb-4"
/>
```

The settings root redirects to the org profile and the sidebar owns navigation, so this link is dead weight. Find them with:

```bash
grep -rln 'label="Settings"' 'apps/couriers/src/app/[orgSlug]/settings'
```

For each file:

- remove the `<PageBreadcrumb ... label="Settings" ... />` element whose `href` is the settings root (`/${orgSlug}/settings`, `` `${basePath}/settings` `` or similar);
- **keep** any `PageBreadcrumb` that points somewhere else (e.g. `label="Locations"`, `label="Users"`, `label="Roles"`);
- remove `PageBreadcrumb` from the `@876/ui/page` import only when it is no longer used in that file;
- if `orgSlug` / `params` becomes unused in a page, remove the now-unused destructure, but keep the component `async` and its `params` prop type if other code still reads it. Do not change anything else.
- If a test in the same directory asserts the Settings back link exists, delete only that assertion (or that `it()`), and say so in the report.

## Task 4 — tests

Update `settings-nav.test.ts` so it matches the new registry exactly (the existing `toEqual` list must include the new Modules group entries and no longer include `modules`/`portal` in Product). Change the active-key case `['/island-logistics/settings/modules/invoices', 'modules']` to expect `'module-invoices'`.

Add these `it()` cases to `settings-nav.test.ts`:

1. every Modules-group entry `href` is `/settings/modules/<key>` where `<key>` is a key in `COURIERS_MODULE_CATALOG` (import from `@/lib/modules`), and `general` is not present;
2. every non-`general` catalog module appears exactly once in the Modules group (anti-drift);
3. every icon key used by `SETTINGS_NAV_GROUPS` resolves to a component in `SETTINGS_NAV_ICONS` (not the fallback);
4. `resolveSettingsActiveKey('/island-logistics/settings/modules/portal', '/island-logistics')` is `'module-portal'`.

## Verification — run ONE at a time, in the foreground

```bash
pnpm --filter @876/couriers-app exec vitest run src/components/shell 'src/app/[orgSlug]/settings'
pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
node scripts/check-app-structure.mjs
```

If the package name differs, read `apps/couriers/package.json` `name`. Fix failures you caused. Never add `eslint-disable`, `@ts-ignore`, or `as any`.

## Report (required)

Write `plans/2026-09-15-document-templates-and-branding/reports/opencode/2026-09-15-couriers-settings-module-nav.md` containing: files changed/deleted, icons chosen, any test assertion removed, the verification output summary (pass/fail counts), and anything you could not do.
