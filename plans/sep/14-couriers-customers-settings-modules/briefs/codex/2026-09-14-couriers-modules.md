# Brief C — Canonical 876 Couriers application modules + customer-creation kill switch

Read `plans/2026-09-14-couriers-customers-settings-modules/briefs/_shared-preamble.md` first — binding.
Also read: `.claude/rules/module-settings.md`, `.claude/rules/app-access.md`,
`.claude/rules/feature-flags.md`, `docs/architecture/016-canonical-application-module-registry.md`,
`docs/architecture/026-module-runtime-access.md`.

## Problem
Console → Apps → 876 Couriers shows exactly one module, `delivery`, seeded in
`apps/api/src/seeds/plans.ts` (the `appSlug: '876-couriers'` entry). Couriers' real
product capabilities are larger. `@876/core/modules` (`packages/core/src/modules.ts`)
has registries for Billing, Invoice, Projects, Commerce — none for Couriers.
`packages/couriers/src/settings-catalog.ts` declares settings modules
(`general`, `customers`, `items`, `packages`, `pre-alerts`, `warehouse`, `manifests`, …)
with their own labels.

## Required outcome
1. `packages/core/src/modules.ts`: add `COURIERS_MODULES` canonical identity with exactly:
   - `customer-portal` — Customer portal
   - `deliveries` — Deliveries
   - `pre-alerts` — Pre-alerts
   - `packages` — Packages
   - `customers` — Customers
   Short, factual one-line descriptions (follow the style of the existing objects).
   Add `COURIERS_MODULE_REGISTRY` (`app: '876-couriers'`), register it in
   `APP_MODULE_REGISTRIES`, add `COURIERS_COMMERCIAL_MODULE_KEYS` =
   `['customer-portal','deliveries','pre-alerts','packages','customers']` and update the
   explanatory comment block. Update `packages/core/src/modules.test.ts` accordingly.
2. `packages/couriers/src/settings-catalog.ts`: where a settings module is the same
   concept (`customers`, `packages`, `pre-alerts`), take `label`/`description` from
   `COURIERS_MODULES` instead of re-declaring them (see how
   `packages/billing/src/settings-catalog.ts` reuses `FINANCE_MODULES`). `customers` and
   `packages` stay `optional: false`. Add anti-drift tests like billing's.
   Do not rename any settings/preference key.
3. `apps/api/src/seeds/plans.ts`: replace the single `delivery` couriers entry with the five
   canonical modules (identity from `COURIERS_MODULES`, positions 10..50, included in
   `876-couriers-free` and `876-couriers-pro`, follow how Projects/Invoice entries source identity).
   **Durable-key rename `delivery` → `deliveries`:** do NOT leave a second row. Implement an
   explicit legacy mapping the seed applies in place (rename the existing
   `application_modules` row's key, preserving its id and its `plan_modules` links), and
   fail loudly if both `delivery` and `deliveries` rows exist for 876-couriers (collision
   → operator decision, per feature-flags.md migration-collision rule). Look for an existing
   legacy-key mechanism in plans.ts / plans.repository.ts first and reuse it. Tests in
   `plans.test.ts` / `plans.repository.test.ts` covering: fresh seed, rename-in-place, collision.
   Also grep for any other runtime reference to the `delivery` module key
   (`rg "'delivery'" apps packages`) and update genuine module-key references only.
4. Feature flag kill switch: in `apps/api/src/seeds/features.ts` add canonical
   `couriers-customers-create` (standalone flag, app 876-couriers, enabled by default)
   meaning "new Couriers customers may be created". Seed test for spelling. Do NOT wire
   runtime enforcement — another agent does that in the Couriers app.
   Answer in your report, in 3-4 sentences, why customers is a non-optional module and
   why the pause is a flag (module = org-controlled usage; flag = platform rollout/kill switch).

Do not run seeds or migrations against any database.

## File scope (only these)
- `packages/core/src/modules.ts`, `packages/core/src/modules.test.ts`
- `packages/couriers/src/settings-catalog.ts` (+ its test)
- `apps/api/src/seeds/plans.ts`, `plans.repository.ts`, their tests
- `apps/api/src/seeds/features.ts`, `features.test.ts`
- any direct consumer that breaks typecheck because of your registry change (report each)

## Verify (run, report real output)
pnpm --filter @876/core test -- modules
pnpm --filter @876/core typecheck
pnpm --filter @876/couriers typecheck && pnpm --filter @876/couriers test
pnpm --filter @876/api typecheck
pnpm --filter @876/api exec vitest run src/seeds
grep -rn "eslint-disable\|as any" <files you touched>

## Report
plans/2026-09-14-couriers-customers-settings-modules/reports/codex/2026-09-14-couriers-modules.md
