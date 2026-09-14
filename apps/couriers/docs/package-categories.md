# Package categories

## Category vs package type vs description

A package carries three separate classification concepts:

| Field                 | What it describes                                                        | Notes                                        |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `Package.categoryId`  | The primary contents of the package (`PackageCategory`).                 | Tenant-owned, one level deep.                |
| `Package.packageType` | The physical container (`carton`, `envelope`, `bag`, `pallet`, `other`). | Fixed container values, not tenant taxonomy. |
| `Package.description` | Free-form human-readable text about the package.                         | Not a classification.                        |

## Data model

`PackageCategory` is defined in `apps/couriers-api/prisma/schema/package-category.prisma`.

- `id` (`cuid`), `tenantId` (`tenant_id`, nullable), `provisioningKey` (`provisioning_key`, nullable)
- `name`, `slug`, `description` (nullable), `icon` (nullable)
- `sortOrder` (`sort_order`, default `0`), `isActive` (`is_active`, default `true`)
- `createdAt` (`created_at`), `updatedAt` (`updated_at`), `deletedAt` (`deleted_at`, nullable)
- Relations: `tenant` (`Tenant`, cascade delete), `packages` (`Package[]`)

Archive is soft: deleting a category sets `deleted_at` rather than removing the row. Partial unique indexes are scoped to non-archived rows:

- `(tenant_id, slug)` unique where `deleted_at IS NULL`.
- `(tenant_id, provisioning_key)` unique where `deleted_at IS NULL AND provisioning_key IS NOT NULL`.

A supporting index covers `(tenant_id, is_active, sort_order)`.

## Tenant API

The router is mounted at `/v1/tenants/:tenantId/package-categories` with `admin` security (`apps/couriers-api/src/modules/package-categories/package-categories.routes.ts`).

| Method   | Path         | Purpose                                   |
| -------- | ------------ | ----------------------------------------- |
| `GET`    | `/`          | List package categories for the tenant.   |
| `POST`   | `/`          | Create a package category.                |
| `POST`   | `/reconcile` | Reconcile provisioned package categories. |
| `GET`    | `/:id`       | Retrieve a package category.              |
| `PATCH`  | `/:id`       | Update a package category.                |
| `DELETE` | `/:id`       | Archive a package category (soft delete). |

## Provisioned defaults

876 Couriers ships 26 flat category defaults. Each has a stable, immutable `provisioningKey`:

`apparel-clothing`, `footwear`, `fashion-accessories`, `electronics`, `phones-accessories`, `computers-accessories`, `appliances`, `health-supplements`, `beauty-personal-care`, `medical-supplies`, `home-kitchen`, `household`, `furniture`, `sports-fitness`, `toys-games`, `baby-kids`, `automotive`, `tools-hardware`, `office-school`, `food-grocery`, `pet-supplies`, `books-media`, `documents-mail`, `business-industrial`, `personal-items`, `other`.

The bootstrap list lives in `apps/api/src/modules/provisioning/provisioning-import.couriers.ts` and is published through the Couriers provisioning manifest (`apps/couriers/src/lib/provisioning/manifest.ts`). Once published, the database-backed manifest is the source of truth.

Reconciliation (`reconcileProvisionedPackageCategories`) is create-missing:

- It runs during onboarding completion (`apps/couriers/src/app/api/manage/onboarding/complete/route.ts`).
- For each default, if a row with the same `provisioningKey` already exists, it is skipped — tenant renames, `sortOrder`, and `isActive` state are never overwritten.
- If no row has the key but a non-archived row already uses the same slug, that row is adopted by setting its `provisioningKey`. A same-slug row that already carries a different `provisioningKey` raises `package-category/provisioning-key-conflict`.
- Otherwise a new category is created for the tenant.

Tenant-created categories are never deleted by reconciliation.

## Assigning a category to a package

- A new package assignment requires an active category owned by the same tenant. `requireActivePackageCategory` returns `package-category/not-found` when the category is missing and `package-category/inactive` when it is inactive.
- Historical packages may continue referencing a category that has since been deactivated or archived.
- Clearing the category sends `category_id: null`.
- The package list accepts a `category_id` filter; the Packages list UI exposes it as a `?category=` query parameter.

## Management UI

- Categories are managed at **Settings → Customization → Package categories** (`apps/couriers/src/app/[orgSlug]/settings/customization/package-categories/`).
- Create and edit pages are restricted to `admin`/`super-admin` (`new/page.tsx`, `[id]/edit/page.tsx` check `ctx.role`).
- The Packages list `?category=` filter narrows the list to a single category.

## Not in scope

Couriers categories are a single flat level. There is no parent/child hierarchy, browse path, product type, collection, or Commerce taxonomy; the rich product taxonomy belongs to 876 Commerce.
