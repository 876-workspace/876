# Couriers settings — modules as sidebar items (opencode report)

Date: 2026-09-15 · Branch: `feat/couriers-settings-module-nav` (no commits made)

## Files changed

**Task 1 — sidebar registry + icons**
- `apps/couriers/src/components/shell/settings-nav.ts` — deleted `modules` and
  `portal` entries from the `product` group; added a literal `modules` group
  between `organization` and `product` with the 7 specified entries
  (`module-items` … `module-portal`), `general` excluded.
- `apps/couriers/src/components/shell/nav-icons.tsx` — removed `modules`
  (`Squares2X2Icon`) and `portal` keys; added the seven `module-*` keys.

**Task 2 — deleted**
- `apps/couriers/src/app/[orgSlug]/settings/modules/page.tsx`
- `apps/couriers/src/app/[orgSlug]/settings/modules/page.test.tsx`
- `modules/[moduleKey]/page.tsx` kept. No code referenced the index
  (`/settings/modules` exact-match grep is clean; settings root redirects to
  `orgprofile`).

**Task 3 — Settings back link removed (26 files)**
automation/rules, billing, branding, communication/reminders,
communication/templates, customization/address-format,
customization/customer-id-types, customization/fields,
customization/package-categories/_components/package-categories-shell,
developer/api-keys, developer/webhooks, domain, general, integrations,
locations/_components/locations-shell, modules/[moduleKey],
notifications, orgprofile/_components/profile-settings-shell, portal,
portal/access, portal/branding, rates, rates/currencies, rates/customs,
rates/taxes, subscription, warehouses/_components/warehouses-shell.
In each: Settings-root `PageBreadcrumb` removed, `PageBreadcrumb` dropped
from the `@876/ui/page` import where unused, unused `orgSlug`/`params`
destructures removed (components kept `async`). Non-Settings breadcrumbs
(`Locations`, `Warehouses`, `Package categories`) untouched.
Follow-up cleanup by me (lint warning): `ProfileSettingsShell` lost its now-
unused `orgSlug` prop; callers updated (`orgprofile/page.tsx` — also dropped
its unused destructure, still passes `params` through;
`orgprofile/loading.tsx` — dropped `useParams`).

**Task 4 — tests**
- `apps/couriers/src/components/shell/settings-nav.test.ts` — `toEqual` list
  rebuilt with the Modules group; `modules/invoices` case now expects
  `module-invoices`; added `module-portal` resolve case plus the Modules-group
  describe block (catalog-href check, literal anti-drift check, icon-registry
  check).

## Icons chosen (all verified present in `packages/ui/src/icons.ts`)

| Sidebar key | Icon |
|---|---|
| module-items | `ArchiveBoxIcon` |
| module-warehouse | `BuildingLibraryIcon` |
| module-manifests | `ClipboardDocumentListIcon` |
| module-deliveries | `TruckIcon` |
| module-invoices | `DocumentTextIcon` |
| module-payments | `ReceiptPercentIcon` |
| module-portal | `WindowIcon` (reused) |

No new dependency. None collide with existing `SETTINGS_NAV_ICONS` values.

## Test assertions removed

None. No test file asserted the Settings back link
(`PageBreadcrumb`/`label="Settings"` grep over settings `*.test.*` was empty).

## Verification output

- `pnpm --filter @876/couriers-app exec vitest run src/components/shell 'src/app/[orgSlug]/settings'` —
  **28 files / 173 tests, all pass**.
- `pnpm --filter @876/couriers-app typecheck` — **clean**.
- `pnpm --filter @876/couriers-app lint` — **0 errors**; 13 warnings, all
  pre-existing in untouched files (verified none in changed files).
- `node scripts/check-app-structure.mjs` — **OK**.

## Could not do / deviations

1. **Brief's catalog premise was wrong; test case 2 adjusted.** The brief
   states the catalog keys are exactly
   `general, items, warehouse, manifests, deliveries, invoices, payments, portal`.
   The runtime `COURIERS_MODULE_CATALOG` actually has **11** modules: three
   entries spread core definitions (`...COURIERS_MODULES.customers`,
   `...COURIERS_MODULES.packages`, `...COURIERS_MODULES.preAlerts` in
   `packages/couriers/src/settings-catalog.ts:58,121,160`), yielding extra
   `customers`, `packages`, `pre-alerts` keys. The specified "every
   non-general catalog module appears exactly once" assertion therefore fails
   (sidebar has 7, catalog non-general has 10). The sidebar keeps exactly the
   7-entry literal from the brief; the anti-drift test instead pins that
   7-href literal (with a NOTE comment explaining the exclusion) while test
   case 1 still enforces every sidebar href key ∈ catalog and `general`
   absent. If `customers`/`packages`/`pre-alerts` sidebar entries are wanted,
   say so and I'll add them (plus icons) and restore the 1:1 test.
2. **Left untouched (out of scope):**
   `apps/couriers/src/app/[orgSlug]/settings/_lib/settings-groups.ts` still
   references `icon: 'portal'` and `/settings/portal*` hrefs, but that is the
   separate card-group system (`defineSettingsNav` from `@876/settings/nav`),
   not the sidebar rail — the brief did not ask to change it.
3. Pre-existing worktree dirt (`packages/core/package.json`,
   `packages/ui/src/styles.css`, untracked `packages/core/src/lib/*`) was not
   mine and was left alone.
