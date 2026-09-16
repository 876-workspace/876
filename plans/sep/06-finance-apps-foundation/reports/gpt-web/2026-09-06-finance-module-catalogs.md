# Phase 3 — Finance module catalogs

Date: 2026-09-06  
Branch: `feature/finance-apps`

## Outcome

Phase 3 declares the organization-controlled module vocabulary for 876 Billing and 876 Invoice without introducing persistence, preferences, feature flags, or migrations.

The finance catalogs now have one shared eight-module subset used by both apps and seven Billing-only modules. Invoice's exported catalog is the shared catalog itself, so shared module labels and descriptions cannot drift by being retyped in a second declaration.

Both apps expose typed app-local module keys and guards, settings-hub navigation, an aggregate `/settings/modules` surface, and canonical `/settings/modules/<module-key>` detail routes. Module state is rendered from `enabledByDefault`; the controls are disabled because no module-state datastore exists in this phase.

## Baseline verification

The brief's stated baselines were checked before implementation:

- `packages/settings/src/` exists and exports catalog, preference, navigation, readiness, and type primitives through `@876/settings`.
- `packages/billing`, `apps/billing`, and `apps/invoice` did not depend on `@876/settings` before this phase.
- `packages/couriers/src/settings-catalog.ts`, `apps/couriers/src/lib/modules/{catalog,index}.ts`, and the Couriers module settings routes exist and were used as the reference shape.
- `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` and its adjacent test exist.
- Billing's settings landing page exists under `apps/billing/src/app/(app)/settings/(list)/` and already composes the shared `SettingsHub` from Billing's permission-filtered settings sections.
- The relevant Vitest configs use the `node` environment for `@876/billing`, `@876/billing-app`, and `@876/invoice-app`. The route tests therefore exercise async server-component rejection behavior without adding DOM component tests.

The remote branch was refreshed before implementation and again immediately before this report commit. No concurrent commit was present at the second refresh; the pre-report head was `892f5a713c59f712333dc38207d84613f813b6c0`.

## Phase status and literal `it()` count

| Phase | Status | Newly added literal `it()` cases | Coverage |
| --- | --- | ---: | --- |
| 3a — shared catalog | Complete | 0 | Production catalog; assertions live in 3c. |
| 3b — app-local catalogs | Complete | 12 | 6 Billing + 6 Invoice key-list/type-guard cases, including unknown, underscore, empty, shared, and cross-catalog negative space. |
| 3c — anti-drift | Complete | 10 | Exact keys, kebab-case, uniqueness, shared label/description parity, strict subset, Billing-only exclusion, and module-only shape. |
| 3d — settings navigation | Complete | 4 | 2 Billing + 2 Invoice additions for canonical destinations and structural cloneability. The Invoice nav test already contained 5 unrelated cases before this phase. |
| 3e — module surfaces | Complete | 8 | 4 Billing + 4 Invoice dynamic-route rejection cases proving invalid keys reach `notFound()`. |
| **Total newly added** | **Complete** | **34** | Exceeds the requested floor of 26 literal `it()` cases. |

The touched test files contain 39 literal `it()` cases in total because `settings-nav.test.ts` already had 5 cases before this phase; 34 were added by this work.

## Catalogs

### Shared by Billing and Invoice

- `invoices`
- `quotes`
- `payments`
- `expenses`
- `items`
- `sales-receipts`
- `time-tracking`
- `customers`

### Billing only

- `subscriptions`
- `banking`
- `credit-notes`
- `purchases`
- `payroll`
- `price-lists`
- `discounts`

All durable module identifiers are declared directly in canonical kebab-case. No identifier is derived by translating underscores.

Every module currently has:

- `key`
- `label`
- `description`
- `optional: true`
- `enabledByDefault: true`
- `preferences: []`

No preference keys were invented.

## Decisions the brief did not fully settle

### `optional` and default state

`@876/settings` requires `optional` in addition to the fields named in the brief. All finance modules are declared `optional: true` because these catalogs represent organization-controlled functional areas rather than structural platform requirements.

All modules are `enabledByDefault: true`. This preserves existing product availability while the state datastore does not yet exist and avoids misusing module defaults as a rollout mechanism. Rollout remains a feature-flag concern; module state remains organization-controlled configuration.

### Catalog typing

The pre-phase `defineModuleCatalog()` signature returned the broad `ModuleCatalog` type, which erased literal keys and extra catalog metadata. That made the requested app-local key union impossible to derive precisely without a second hand-maintained key list or unsafe casts.

The shared helper now preserves the input tuple type while retaining a readonly return. `ModuleDefinition.preferences` and enum `options` are typed readonly to match the runtime behavior that already freezes both collections. This is a type-contract correction only; catalog validation and freezing behavior are unchanged.

### Settings permissions

The new read-only module surfaces use each app's existing settings permission:

- Billing: `settings:read`
- Invoice: `settings.view`

This phase does not create new permissions or change role persistence. Invalid module keys are rejected before the settings guard is called.

### Settings landing-page composition

Invoice receives a `Modules` group directly in its existing plain-data settings registry. Billing keeps its existing permission-filtered settings-section adapter and appends a separate plain-data `Modules` group at the landing page. This follows each app's current pattern rather than forcing Invoice's registry shape onto Billing.

Each module navigation item is named `"<Module> settings"` and links directly to `/settings/modules/<canonical-key>`. Both apps also expose `/settings/modules` as the aggregate module list.

## Permission-vocabulary gap left intentionally

The requested module vocabulary is ahead of the current canonical permission catalogs.

Most importantly, Invoice's current permission catalog declares `estimates`, while this phase requires the durable module key `quotes`. Several requested finance modules also do not yet have corresponding permission modules in one or both apps.

This work does **not** rename `estimates` to `quotes`, add parallel semantic permission identifiers, or rewrite persisted role grants. Permission identifiers are durable and changing them requires a coordinated access-contract decision and migration. That work is outside this module-catalog phase and must be resolved before per-module permission enforcement or persisted module-state mutations are introduced.

Until then, these read-only settings surfaces are correctly gated by the existing Settings permission rather than by invented `<module>.view` permissions.

## Files changed

### Shared settings primitives

| File | Change reason |
| --- | --- |
| `packages/settings/src/catalog.ts` | Preserve literal catalog tuple types while retaining the existing readonly/frozen public contract. |
| `packages/settings/src/types/module.ts` | Mark frozen module preference collections readonly so const catalog tuples remain type-safe. |
| `packages/settings/src/types/preference.ts` | Mark frozen enum option collections readonly for the same runtime/type alignment. |

### Shared Billing package

| File | Change reason |
| --- | --- |
| `packages/billing/package.json` | Add `@876/settings` and export `@876/billing/settings-catalog`. |
| `packages/billing/src/settings-catalog.ts` | Declare the shared finance subset, Billing-only subset, and exported Billing/Invoice catalogs. |
| `packages/billing/src/settings-catalog.test.ts` | Add the 10-case catalog and anti-drift suite. |

### Billing app

| File | Change reason |
| --- | --- |
| `apps/billing/package.json` | Add the explicit `@876/settings` workspace dependency required by the phase. |
| `apps/billing/src/lib/modules/catalog.ts` | Re-export the shared Billing catalog, derive `BillingModuleKey`, derive the readonly key list, and expose `isBillingModuleKey`. |
| `apps/billing/src/lib/modules/index.ts` | Export the app-local module contract from one module boundary. |
| `apps/billing/src/lib/modules/catalog.test.ts` | Cover valid, Billing-only, unknown, underscore, empty, and derived-order key behavior. |
| `apps/billing/src/app/(app)/settings/(list)/_lib/module-settings-group.ts` | Convert the Billing catalog into serializable settings-hub plain data. |
| `apps/billing/src/app/(app)/settings/(list)/_lib/module-settings-group.test.ts` | Pin canonical labels/hrefs and structural cloneability. |
| `apps/billing/src/app/(app)/settings/(list)/page.tsx` | Append the Modules group to Billing's existing settings-hub composition. |
| `apps/billing/src/app/(app)/settings/modules/page.tsx` | Add the aggregate module list with default state and a disabled state control. |
| `apps/billing/src/app/(app)/settings/modules/[moduleKey]/page.tsx` | Add canonical module detail routing with type-guard rejection and `notFound()`. |
| `apps/billing/src/app/(app)/settings/modules/[moduleKey]/page.test.tsx` | Add four explicit invalid-route `notFound()` cases. |

### Invoice app

| File | Change reason |
| --- | --- |
| `apps/invoice/package.json` | Add the explicit `@876/settings` workspace dependency required by the phase. |
| `apps/invoice/src/lib/modules/catalog.ts` | Re-export the derived Invoice catalog, derive `InvoiceModuleKey`, derive the readonly key list, and expose `isInvoiceModuleKey`. |
| `apps/invoice/src/lib/modules/index.ts` | Export the app-local module contract from one module boundary. |
| `apps/invoice/src/lib/modules/catalog.test.ts` | Cover valid, Billing-only rejection, unknown, underscore, empty, and derived-order key behavior. |
| `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` | Add a serializable Modules settings group using canonical catalog keys. |
| `apps/invoice/src/app/(app)/settings/_lib/settings-nav.test.ts` | Add canonical module destination and structural-clone assertions while retaining the existing nav suite. |
| `apps/invoice/src/app/(app)/settings/modules/page.tsx` | Add the aggregate module list with default state and a disabled state control. |
| `apps/invoice/src/app/(app)/settings/modules/[moduleKey]/page.tsx` | Add canonical module detail routing with type-guard rejection and `notFound()`. |
| `apps/invoice/src/app/(app)/settings/modules/[moduleKey]/page.test.tsx` | Add four explicit invalid-route `notFound()` cases, including a Billing-only key. |

No file under the concurrency exclusion paths was changed:

- `packages/billing-ui/**`
- either app's `customers/**`
- `apps/billing/src/app/(app)/settings/users/**`
- `apps/billing/src/app/api/app-memberships/**`
- `packages/access-ui/**`

## Deliberately absent from this phase

- No module-state table.
- No preference table or finance preference definitions.
- No migration.
- No feature flag or feature-flag gate.
- No mutating module API.
- No interactive toggle that discards changes.
- No underscore-to-kebab identifier translation.
- No explanatory paragraph under a settings page heading.
- No changes to the concurrent-edit paths.

## Items not executable or not fully verifiable from this environment

The repository's GPT web operating rules prohibit shell execution, so no tests, typechecks, formatter, package install, app-structure script, browser run, or command-based code-review workflow was executed here. The implementation was reviewed statically through repository reads only.

`pnpm-lock.yaml` was not regenerated. The phase adds three workspace dependency declarations (`packages/billing`, `apps/billing`, and `apps/invoice`), but the available connector writes whole files and is not a safe mechanism for rewriting the repository lockfile during concurrent work. If the orchestrator uses frozen-lockfile installation, it should run the repository's normal `pnpm install` workflow and commit the lockfile delta if pnpm requires one.

Visual rendering of the SettingsHub columns and disabled controls was not browser-verified. The implementation reuses the existing shared `SettingsHub` landing-page component rather than adding a hand-assigned grid.

## Verification for the orchestrator

These commands were requested by the brief and have **not** been run here:

```sh
pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```

Before running them on a fresh checkout, reconcile the workspace lockfile if the package manager reports that the package manifests changed without a matching lockfile update.
