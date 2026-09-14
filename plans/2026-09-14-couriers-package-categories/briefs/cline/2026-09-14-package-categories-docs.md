# Brief (Cline): document Couriers package categories

Repo /root/projects/876, branch already checked out. Do not commit. Docs only.

Create exactly ONE file: `apps/couriers/docs/package-categories.md`. Match the tone/format of
`apps/couriers/docs/customers.md` (read its first 40 lines only). Read budget: at most these files, then
write:

1. `plans/2026-09-14-couriers-package-categories/plan.md` (design decisions — the source of truth)
2. `apps/couriers-api/prisma/schema/package-category.prisma`
3. `apps/couriers-api/src/modules/package-categories/package-categories.routes.ts`
4. `apps/couriers-api/src/modules/package-categories/package-categories.service.ts` (reconcile function only)
5. `apps/api/src/services/provisioning/provisioning-import.couriers.ts` (first 60 lines)
6. `apps/couriers/src/lib/provisioning/manifest.ts`

Sections: `# Package categories`; "Category vs package type vs description" (a 3-row table);
"Data model" (fields, soft archive via `deleted_at`, partial unique indexes on slug and provisioning key
among non-archived rows); "Tenant API" (list each route: method, path, purpose); "Provisioned defaults"
(26 flat defaults, stable `provisioningKey`, create-missing reconciliation during onboarding completion,
never overwrites tenant renames/order/active state, adopts an existing same-slug row); "Assigning a
category to a package" (active + same tenant required; historical packages may reference inactive
categories; clearing sends null); "Management UI" (Settings → Customization → Package categories, admin
only; Packages list `?category=` filter); "Not in scope" (no hierarchy — rich taxonomy belongs to 876
Commerce).

No prose padding, no invented behavior — if a file does not confirm something, leave it out. Then write a
3-line report to `plans/2026-09-14-couriers-package-categories/reports/cline/2026-09-14-package-categories-docs.md`.
