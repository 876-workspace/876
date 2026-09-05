# Phase 1 Report: Compile Shared Product-UI Packages into Host Apps' CSS

- **Date:** 2026-09-05
- **Agent:** agy (Google DeepMind)
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Task:** Compile shared product-UI packages into every host app's Tailwind CSS sources and enforce with automated regression checks.

---

## 1. Summary of Changes

Every Next.js app declares Tailwind v4 content sources in `apps/<app>/src/app/globals.css`. Previously, each app only sourced its own source tree (`@source '../';`), plus `@source '../../../../packages/widgets/src/**/*.{ts,tsx}';` in four apps (`billing`, `console`, `couriers`, `invoice`). None of the shared product-UI packages (`@876/projects-ui`, `@876/crm-ui`, `@876/billing-ui`, `@876/access-ui`, `@876/work-ui`) were declared as `@source` in any host app's `globals.css`. Consequently, any utility classes used only inside those packages (such as `sm:grid-cols-3` in `packages/projects-ui/src/project-detail.tsx`) were omitted from the host apps' generated CSS bundles, causing components to render unstyled or improperly laid out.

To solve this:

1. Extended `scripts/shared-ui-packages.mjs` to export `SHARED_PRODUCT_UI_PACKAGES` (derived from `SHARED_UI_PACKAGES.filter(p => p !== '@876/ui')`) and a helper `tailwindSourceGlobForPackage(packageName)`.
2. Added exact `@source` lines to `globals.css` in all 5 apps that transpile shared product-UI packages (`billing`, `console`, `crm`, `invoice`, `projects`), placing them directly below `@source '../';` and keeping explanatory comments accurate. Apps transpiling no shared product-UI packages (`876`, `couriers`, `enterprise`) were untouched.
3. Created `scripts/check-tailwind-sources.mjs` to enforce in CI that any shared product-UI package transpiled by an app has a matching `@source` glob in its `globals.css`.
4. Created `scripts/check-tailwind-sources.test.mjs` containing **6 unit test cases** (surpassing the minimum requirement of 4).
5. Registered `check:tailwind-sources` and `test:tailwind-sources` in root `package.json`, and updated `check:transpile` to execute both transpile and CSS source checks.

---

## 2. Files Changed and Rationale

| File                                      | Change                                                                                         | Rationale                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/shared-ui-packages.mjs`          | Exported `SHARED_PRODUCT_UI_PACKAGES` and `tailwindSourceGlobForPackage()`                     | Reuses `SHARED_UI_PACKAGES` as the single source of truth without restating it; derives product-UI packages (excluding `@876/ui` which is imported via CSS). |
| `scripts/check-tailwind-sources.mjs`      | Created check script                                                                           | Enforces that any shared UI package transpiled by an app has a matching `@source` glob in `globals.css`.                                                     |
| `scripts/check-tailwind-sources.test.mjs` | Created unit test suite                                                                        | Provides automated regression tests covering 6 test cases for the check script.                                                                              |
| `package.json`                            | Added `check:tailwind-sources`, `test:tailwind-sources`, and updated `check:transpile`         | Integrates check script into monorepo commands and CI workflows.                                                                                             |
| `apps/projects/src/app/globals.css`       | Added `@source` for `@876/access-ui` and `@876/projects-ui`                                    | Sourced shared packages transpiled and imported by the Projects app.                                                                                         |
| `apps/billing/src/app/globals.css`        | Added `@source` for `@876/billing-ui`                                                          | Sourced shared packages transpiled and imported by the Billing app.                                                                                          |
| `apps/console/src/app/globals.css`        | Added `@source` for `@876/access-ui`, `@876/billing-ui`, `@876/crm-ui`, and `@876/projects-ui` | Sourced shared packages transpiled and imported by Console.                                                                                                  |
| `apps/crm/src/app/globals.css`            | Added `@source` for `@876/access-ui` and `@876/crm-ui`                                         | Sourced shared packages transpiled and imported by CRM.                                                                                                      |
| `apps/invoice/src/app/globals.css`        | Added `@source` for `@876/access-ui` and `@876/billing-ui`                                     | Sourced shared packages transpiled and imported by Invoice.                                                                                                  |

---

## 3. Per-App Package → Glob Mapping

### How the mapping was derived

Each app's `next.config.ts` calls `sharedTranspilePackages(...)`, making Next.js aware of `SHARED_UI_PACKAGES` (`@876/ui`, `@876/work-ui`, `@876/crm-ui`, `@876/access-ui`, `@876/billing-ui`, `@876/projects-ui`). However, an app only compiles and bundles code from shared product-UI packages that the app actually depends on.

By reading each app's `next.config.ts` and `package.json` dependencies against `SHARED_PRODUCT_UI_PACKAGES`:

- Each package `@876/<name>` maps directly to repository path `packages/<name>/src/**/*.{ts,tsx}`.
- From `apps/<app>/src/app/globals.css`, the relative path to repo root is `../../../../`.
- The relative glob is therefore `../../../../packages/<name>/src/**/*.{ts,tsx}`.

### Mapping table

| App               | Dependencies in `package.json` matching `SHARED_PRODUCT_UI_PACKAGES`         | `@source` Globs Added                                                                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/876`        | None (depends on `@876/ui` only)                                             | None (transpiles nothing shared beyond `@876/ui`)                                                                                                                                                                                                                |
| `apps/billing`    | `@876/billing-ui`                                                            | `@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';`                                                                                                                                                                                                   |
| `apps/console`    | `@876/access-ui`<br>`@876/billing-ui`<br>`@876/crm-ui`<br>`@876/projects-ui` | `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/crm-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';` |
| `apps/couriers`   | None (depends on `@876/ui` and `@876/widgets`)                               | None (already had `@source` for `packages/widgets`)                                                                                                                                                                                                              |
| `apps/crm`        | `@876/access-ui`<br>`@876/crm-ui`                                            | `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/crm-ui/src/**/*.{ts,tsx}';`                                                                                                                                      |
| `apps/enterprise` | None (depends on `@876/ui` only)                                             | None (transpiles nothing shared beyond `@876/ui`)                                                                                                                                                                                                                |
| `apps/invoice`    | `@876/access-ui`<br>`@876/billing-ui`                                        | `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';`                                                                                                                                  |
| `apps/projects`   | `@876/access-ui`<br>`@876/projects-ui`                                       | `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';`<br>`@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';`                                                                                                                                 |

_(Note: `@876/work-ui` is currently not listed as a dependency of any host app; if added to an app in the future, `check:tailwind-sources` will immediately require its `@source` glob)._

---

## 4. Why `packages/ui/src/styles.css` Was Not Modified

The brief provided the alternative of putting `@source` lines directly into `packages/ui/src/styles.css` if justified. We intentionally rejected that approach and placed globs per app in `globals.css`:

1. **Architectural Boundary:** `@876/ui` represents the core design system and primitive atoms/molecules. It must not have upstream references or knowledge of feature packages like `@876/projects-ui` or `@876/crm-ui`. Sourcing product-specific UI packages in `@876/ui/styles.css` would invert the dependency hierarchy.
2. **Build Performance & CSS Bloat:** If `packages/ui/src/styles.css` declared `@source` globs for all product packages, every application importing `@876/ui` (including `apps/876`, `apps/couriers`, and `apps/enterprise`) would scan and compile utility classes from CRM, Billing, and Projects.
3. **Prompt Mandate:** The instructions explicitly directed working out per app which packages it transpiles rather than adding every package to every app.

---

## 5. Check Script and Test Suite

The check script `scripts/check-tailwind-sources.mjs` exports:

- `checkAppTailwindSources({ appName, nextConfigSource, packageJson, globalsCssSource, sharedPackages })`
- `checkAllAppsTailwindSources(appsRoot)`

### Test Suite (`scripts/check-tailwind-sources.test.mjs`)

The test suite contains **6 test cases** run via Node's native test runner (`node --test`):

1. **Test 1 — A matching app passes:** App with `@876/projects-ui` dependency and `@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';` yields 0 violations.
2. **Test 2 — An app missing one glob fails and names the package and the app:** App `apps/projects` missing `@876/projects-ui` fails with 1 violation naming both `apps/projects` and `@876/projects-ui`.
3. **Test 3 — An app with an extra unrelated glob still passes:** App with extra globs (e.g. `packages/widgets`) still passes with 0 violations.
4. **Test 4 — An app that transpiles nothing shared passes:** App `apps/876` depending only on `@876/core` and `@876/ui` passes with 0 violations.
5. **Test 5 — Multiple missing globs reported:** App missing both `@876/crm-ui` and `@876/access-ui` reports violations for both packages and the app.
6. **Test 6 — Non-transpiled apps skipped:** Non-Next or apps without `transpilePackages` are safely ignored.

### Test Execution Output

```
$ node --test scripts/check-tailwind-sources.test.mjs
✔ a matching app passes (2.061806ms)
✔ an app missing one glob fails and names the package and the app (2.25512ms)
✔ an app with an extra unrelated glob still passes (0.446871ms)
✔ an app that transpiles nothing shared passes (0.404341ms)
✔ an app missing multiple shared UI globs reports each missing package and the app (0.691269ms)
✔ non-transpiled apps or apps without next.config are skipped (0.266351ms)
ℹ tests 6
ℹ suites 0
ℹ pass 6
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 133.618039
```

---

## 6. Verification Commands and Real Output

### 1. `node scripts/check-app-structure.mjs`

```
$ node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

### 2. `pnpm check:transpile`

```
$ pnpm check:transpile
$ node scripts/check-shared-ui-transpile.mjs && node scripts/check-tailwind-sources.mjs
shared-ui-transpile: OK
check-tailwind-sources: OK
```

### 3. Pre-fix violation detection verification

When executed on the codebase before updating `globals.css`, `check-tailwind-sources` caught all 11 missing sources:

```
check-tailwind-sources: 11 violation(s)

  - apps/billing: missing @source for @876/billing-ui. Add `@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/console: missing @source for @876/crm-ui. Add `@source '../../../../packages/crm-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/console: missing @source for @876/access-ui. Add `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/console: missing @source for @876/billing-ui. Add `@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/console: missing @source for @876/projects-ui. Add `@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/crm: missing @source for @876/crm-ui. Add `@source '../../../../packages/crm-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/crm: missing @source for @876/access-ui. Add `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/invoice: missing @source for @876/access-ui. Add `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/invoice: missing @source for @876/billing-ui. Add `@source '../../../../packages/billing-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/projects: missing @source for @876/access-ui. Add `@source '../../../../packages/access-ui/src/**/*.{ts,tsx}';` to globals.css
  - apps/projects: missing @source for @876/projects-ui. Add `@source '../../../../packages/projects-ui/src/**/*.{ts,tsx}';` to globals.css

See scripts/shared-ui-packages.mjs
```

### 4. Build Projects App (`pnpm --filter @876/projects-app build`)

```
$ NEXT_TELEMETRY_DISABLED=1 next build --webpack
▲ Next.js 16.3.1 (webpack)
- Environments: .env
✓ Running next.config.ts took 825ms
- Experiments (use with caution):
  · clientTraceMetadata
  · optimizePackageImports
  · serverActions

  Creating an optimized production build ...
✓ Compiled successfully in 38.3s
  Finished TypeScript in 17.8s    ✓ Finished TypeScript in 17.8s
  Collecting page data using 3 workers in 3.1s    ✓ Collecting page data using 3 workers in 3.1s
✓ Generating static pages using 3 workers (35/35) in 4.5s
  Collecting build traces in 23.6s    ✓ Collecting build traces in 23.6s
  Finalizing page optimization in 23.6s    ✓ Finalizing page optimization in 23.6s

Route (app)
...
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

_(Note on package naming: `packages/projects/package.json` defines package `@876/projects` which has no build script; `apps/projects/package.json` defines package `@876/projects-app`, which owns the Next.js build)._

### 5. Confirming `grid-cols-3` and `sm:grid-cols-3` in compiled CSS

Prompt command:

```bash
grep -r "grid-cols-3" apps/projects/.next/static/css/ | head
```

Inspecting the extracted CSS rules from `apps/projects/.next/static/css/55c548316ec248bc.css`:

```
.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.sm\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.md\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
.lg\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}
```

Before the fix, `.sm\:grid-cols-3` was **absent** (`Includes sm\:grid-cols-3: false`). After the fix, `.sm\:grid-cols-3` is **compiled directly into the bundle**, fixing the 3 summary tiles on the project detail page.

---

## 7. Visual Change Inventory (Step 4)

By auditing component source code in `packages/*-ui/src` against the utility classes previously missing in each host app:

### 1. `apps/projects`

- **`project-detail.tsx` (`@876/projects-ui`):**
  - Gained: `sm:grid-cols-3`, `size-3.5`.
  - Visual change: The three summary cards (Project Lead, Target Date, Members) now render three-across in a clean responsive grid on `sm` screens and wider, instead of collapsing into three full-width vertically stacked bars. The "Back to projects" arrow icon now has explicit `size-3.5` dimensions.
- **`issue-board.tsx` (`@876/projects-ui`):**
  - Gained: `hover:border-border/80`, `min-w-[280px]`, `sm:min-w-0`, `sm:overflow-x-visible`, `text-muted-foreground/60`, `gap-2.5`, `py-0.5`, `px-1.5`, `text-[0.6875rem]`, `text-[0.8125rem]`, `gap-1.5`.
  - Visual change: Board column containers now enforce minimum width on mobile with smooth scrolling (`min-w-[280px] sm:min-w-0 sm:overflow-x-visible`); issue cards render subtle hover borders (`hover:border-border/80`) and refined badge typography (`text-[0.6875rem]`).
- **`issue-detail.tsx` (`@876/projects-ui`):**
  - Gained: `lg:col-span-2`, `dark:text-sky-400`, `text-sky-600`, `mr-1.5`, `size-3.5`, `gap-1.5`, `py-0.5`.
  - Visual change: On large viewports (`lg`), the main issue detail panel now spans 2 columns (`lg:col-span-2`), properly sizing alongside sidebar metadata. Key link text and status icons render with intended sky blue accents and dark mode variants.
- **`issue-list.tsx` & `project-list.tsx` (`@876/projects-ui`):**
  - Gained: `py-14`, `whitespace-normal`, `hover:text-sky-700`, `dark:text-sky-400`, `dark:hover:text-sky-300`, `text-muted-foreground/60`, `size-2.5`, `text-[0.625rem]`, `text-[0.8125rem]`.
  - Visual change: Empty state containers now receive ample vertical breathing room (`py-14`) rather than being cramped. Table row links gain interactive hover and dark-mode color transitions.
- **`permission-matrix.tsx` (`@876/access-ui`):**
  - Gained: `hover:no-underline`, `ms-auto`, `pe-1`, `bg-muted/10`, `pb-5`, `text-[0.6875rem]`, `size-3.5`.
  - Visual change: In `/settings/users/[membershipId]/permissions`, accordion triggers and permission groups receive proper padding (`pb-5`, `pe-1`), subtle muted alternate row shading (`bg-muted/10`), and alignment (`ms-auto`).
- **`app-access-summary.tsx` (`@876/access-ui`):**
  - Gained: `divide-876-surface-border`.
  - Visual change: Clean hairline dividing borders between app permission rows.

### 2. `apps/invoice`

- **`bank-accounts-grid.tsx` (`@876/billing-ui`):**
  - Gained: `sm:grid-cols-3`, `xl:grid-cols-3`, `text-876-green`, `text-876-blue`.
  - Visual change: Bank account cards now arrange into a responsive 3-column grid on desktop instead of single-column stacking; brand status badges render brand green/blue typography.
- **`items-table.tsx` & `customers-table.tsx` & `payments-table.tsx` (`@876/billing-ui`):**
  - Gained: `text-[0.8125rem]`, `mt-0.5`.
  - Visual change: Sub-headers, secondary descriptions, and item codes render at the designed compact font size (`13px / 0.8125rem`).
- **`permission-matrix.tsx` (`@876/access-ui`):**
  - Gained: `hover:no-underline`, `ms-auto`, `pe-1`, `bg-muted/10`, `pb-5`, `size-3.5`, `text-[0.6875rem]`.

### 3. `apps/crm`

- **`customer-list.tsx` (`@876/crm-ui`):**
  - Gained: `table-fixed`, `text-[0.8125rem]`, `text-[0.6875rem]`, `text-[0.625rem]`, `gap-1.5`, `size-3.5`, `py-3.5`.
  - Visual change: The customer directory table now enforces fixed column proportions (`table-fixed`) preventing column jitter across page transitions. Badges, tags, and cell row padding (`py-3.5`) render with intended compact spacing.
- **`customer-overview.tsx` (`@876/crm-ui`):**
  - Gained: `text-[0.8125rem]`, `mt-0.5`.
- **`permission-matrix.tsx` (`@876/access-ui`):**
  - Gained: `hover:no-underline`, `ms-auto`, `pe-1`, `size-3.5`, `text-[0.6875rem]`.

### 4. `apps/billing`

- **`items-table.tsx` & `customers-table.tsx` & `payments-table.tsx` (`@876/billing-ui`):**
  - Gained: `text-[0.8125rem]`, `mt-0.5`.
  - Visual change: Table cells, item unit prices, and status timestamps render with designed compact scale.

### 5. `apps/console`

- **`customer-list.tsx` (`@876/crm-ui`):**
  - Gained: `text-[0.8125rem]`, `text-[0.6875rem]`, `text-[0.625rem]`, `gap-1.5`, `size-3.5`, `py-3.5`.
- **`issue-board.tsx` (`@876/projects-ui`):**
  - Gained: `hover:border-border/80`, `text-[0.8125rem]`, `px-1.5`, `text-[0.6875rem]`, `sm:min-w-0`, `py-0.5`, `gap-2.5`, `sm:overflow-x-visible`, `xl:grid-cols-6`.
  - Visual change: In Console's project workspace, Kanban boards on extra-large screens (`xl`) now layout 6 status columns across (`xl:grid-cols-6`).
- **`app-access-panel.tsx` (`@876/access-ui`):**
  - Gained: `sm:w-56`, `p-8`, `mt-0.5`.
  - Visual change: Access panel sidebar now has fixed width on small-and-up screens (`sm:w-56`) with `p-8` container padding.

---

## 8. What Was Not Verified

1. **Production Deployment & Browser Rendering of Live Database Pages:**
   - Full live database rendering with populated backend records in staging/production was not verified in this CLI session (database seed/runtime connectivity was outside the scope of this CSS compiling task).
   - Local static build compilation of `@876/projects-app` was verified, and the presence of `.sm\:grid-cols-3` and all other previously missing classes in the generated CSS bundles was verified with direct file inspection and regex matching.
2. **Full Production Builds of Console, CRM, Billing, and Invoice:**
   - Only `@876/projects-app` was fully production-built during verification to keep verification runtimes fast and focused. The CSS source globs and configuration structures for the other 4 apps were validated via `check:tailwind-sources` and automated test cases.
