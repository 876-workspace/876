# Phase 2 — couriers module preference storage + catalog

## Goal

Give the couriers app **per-organization module settings**: which modules an org has
turned on, and the preference values it has chosen for each. This is the storage and
catalog layer only — no UI, no route handlers (those are Phase 3).

The reusable contracts already exist in the `@876/settings` package (Phase 1, already
merged into this branch). **Read `packages/settings/src/` first** and build on its
exported types and functions. Do not redefine anything it already provides.

## Placement rationale (do not deviate)

Module preferences are **app-local operational data** per
`.claude/rules/platform-services.md` — they live in the couriers datastore, not the
identity API. They are also a _different layer_ from provisioning: provisioning
(`apps/api/domains/provisioning/`) declares what must exist at org creation;
preferences are what an org admin edits afterwards. Do not touch `apps/api`.

## Scope — files

**Create:**

```
apps/couriers/prisma/schema/module-settings.prisma
apps/couriers/src/types/module-settings.ts
apps/couriers/src/lib/modules/catalog.ts
apps/couriers/src/lib/modules/catalog.test.ts
apps/couriers/src/lib/modules/index.ts
```

**Modify:**

```
apps/couriers/package.json                  (add the @876/settings dependency)
apps/couriers/prisma/schema/tenant.prisma   (add the two back-relations only)
apps/couriers/src/lib/db/index.ts           (re-export the two new model types only)
```

Do not modify anything else. Do not commit.

### The dependency and the lockfile — read this before you touch either

Add `"@876/settings": "workspace:*"` to `dependencies` in
`apps/couriers/package.json`, placed in the existing alphabetical order among the
other `@876/*` entries.

**Do NOT run a plain `pnpm install` to pick it up, and do NOT regenerate
`pnpm-lock.yaml`.** In this sandbox a regeneration rewrites the whole file with
different peer resolution — roughly 15,000 deleted lines of unrelated dependency
entries — which `.claude/rules/git.md` explicitly forbids committing.

Instead, hand-add exactly one entry to the `apps/couriers:` importer block's
`dependencies:` section in `pnpm-lock.yaml`, in alphabetical order, matching the
existing style of its sibling `@876/*` workspace entries:

```yaml
'@876/settings':
  specifier: workspace:*
  version: link:../../packages/settings
```

Then verify with `pnpm install --frozen-lockfile`. If it prints
`ERR_PNPM_OUTDATED_LOCKFILE`, your entry is wrong — fix the entry, do not
regenerate the file. If afterwards `git diff --stat pnpm-lock.yaml` shows more
than about 5 changed lines, you regenerated it by mistake: run
`git checkout pnpm-lock.yaml` and redo the hand edit.

## 1. Prisma models

Add to `apps/couriers/prisma/schema/module-settings.prisma`. Follow the conventions
visible in `apps/couriers/prisma/schema/branch.prisma`: `///` doc comments, snake_case
`@map` on every column, Unix-seconds `Int` timestamps, `@@map` to a snake_case plural
table name, cascade delete from `Tenant`.

```prisma
/// Per-organization enablement of a settings module (deliveries, items, …).
/// A missing row means "use the catalog's enabledByDefault" — absence is not "off".
model OrganizationModule {
  id        String  @id @default(cuid())
  tenantId  String  @map("tenant_id")
  /// Module key from the couriers module catalog. Matches a permission-catalog module key.
  module    String
  isEnabled Boolean @default(true) @map("is_enabled")
  createdAt Int     @map("created_at")
  updatedAt Int     @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, module], name: "organization_modules_tenant_id_module_key")
  @@index([tenantId], name: "organization_modules_tenant_id_idx")
  @@map("organization_modules")
}

/// One stored preference value for one module, for one organization.
/// A missing row means "use the catalog default" — never write rows for defaults.
/// Typed value columns mirror the platform provisioning property model so both
/// layers speak the same value vocabulary; exactly one is non-null per row
/// (except `reference`, which uses namespace + key together).
model ModulePreference {
  id                 String  @id @default(cuid())
  tenantId           String  @map("tenant_id")
  module             String
  key                String
  valueType          String  @map("value_type")
  stringValue        String? @map("string_value")
  integerValue       Int?    @map("integer_value")
  /// Decimal carried as a string end-to-end so money and rate values never lose precision.
  decimalValue       String? @map("decimal_value")
  booleanValue       Boolean? @map("boolean_value")
  referenceNamespace String? @map("reference_namespace")
  referenceKey       String? @map("reference_key")
  /// Opaque 876 user id of the last editor. No cross-database foreign key.
  updatedBy          String? @map("updated_by")
  createdAt          Int     @map("created_at")
  updatedAt          Int     @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, module, key], name: "module_preferences_tenant_id_module_key_key")
  @@index([tenantId, module], name: "module_preferences_tenant_id_module_idx")
  @@map("module_preferences")
}
```

In `tenant.prisma`, add exactly two lines to the `Tenant` model's relation block:

```prisma
  organizationModules OrganizationModule[]
  modulePreferences   ModulePreference[]
```

In `apps/couriers/src/lib/db/index.ts`, add `OrganizationModule` and
`ModulePreference` to the existing `export type { … } from './generated/prisma/client'`
list. Change nothing else in that file.

### Migration

Generate the migration and the client:

```
cd apps/couriers && npx prisma migrate dev --name add_module_settings --create-only
npx prisma generate
```

`--create-only` writes the SQL without applying it (no database is reachable here).
If `migrate dev` cannot run without a database connection, instead hand-write the
migration directory `apps/couriers/prisma/migrations/<timestamp>_add_module_settings/migration.sql`
matching the style of the newest existing migration in that folder, then run
`npx prisma generate`. Report which path you took.

## 2. Types — `apps/couriers/src/types/module-settings.ts`

Per `.claude/rules/types.md`, shared contracts live in `src/types/`. Export the
couriers-specific parameter types the service layer will need in Phase 3:

```ts
export interface ModuleStateListParams {
  tenantId: string
}
export interface ModulePreferenceListParams {
  tenantId: string
  module?: string
}
export interface ModulePreferenceUpdateParams {
  tenantId: string
  module: string
  /** Partial patch: only the keys being changed. */
  values: Record<string, boolean | string | number>
  updatedBy?: string
}
export interface ModuleToggleParams {
  tenantId: string
  module: string
  isEnabled: boolean
}
```

Re-use `@876/settings` types (`StoredPreferenceRow`, `ResolvedModulePreferences`,
`ModuleDefinition`) by importing them — do not redeclare them.

## 3. The couriers module catalog — `apps/couriers/src/lib/modules/catalog.ts`

Build it with `defineModuleCatalog` from `@876/settings`.

**Hard requirement:** every module `key` below already exists as a module key in
`apps/couriers/src/lib/permissions/catalog.ts` (`PERMISSION_CATALOG`), except
`general` and `portal`. Add a test asserting that every catalog module key other than
those two is present in `PERMISSION_CATALOG`, so the two catalogs cannot drift.

Use exactly these modules, keys, preference keys, types, and defaults:

### `general` — label "General", `optional: false`, `enabledByDefault: true`

| key              | type      | default           | notes                                             |
| ---------------- | --------- | ----------------- | ------------------------------------------------- |
| `date_format`    | enum      | `dd/mm/yyyy`      | options: `dd/mm/yyyy`, `mm/dd/yyyy`, `yyyy-mm-dd` |
| `timezone`       | string    | `America/Jamaica` | maxLength 64                                      |
| `weight_unit`    | enum      | `lb`              | options: `lb`, `kg`                               |
| `dimension_unit` | enum      | `in`              | options: `in`, `cm`                               |
| `base_currency`  | reference | `JMD`             | namespace `currency`                              |

### `customers` — label "Customers", `optional: false`, `enabledByDefault: true`

| key                       | type    | default | notes                                                    |
| ------------------------- | ------- | ------- | -------------------------------------------------------- |
| `auto_assign_home_branch` | boolean | `true`  | hint: "Assign new customers to the default branch."      |
| `mailbox_auto_assign`     | boolean | `true`  |                                                          |
| `mailbox_number_length`   | integer | `5`     | min 3, max 10                                            |
| `require_identification`  | boolean | `false` | hint: "Require a verified ID before releasing packages." |
| `allow_duplicate_email`   | boolean | `false` |                                                          |

### `items` — label "Items", `optional: true`, `enabledByDefault: true`

| key                | type      | default   | notes                        |
| ------------------ | --------- | --------- | ---------------------------- |
| `track_inventory`  | boolean   | `false`   |                              |
| `default_category` | reference | `general` | namespace `package_category` |

### `packages` — label "Packages", `optional: false`, `enabledByDefault: true`

| key                       | type    | default      | notes                                                                |
| ------------------------- | ------- | ------------ | -------------------------------------------------------------------- |
| `volumetric_divisor`      | integer | `5000`       | min 1000, max 10000. hint: "5000 for courier, 6000 for air freight." |
| `chargeable_weight_rule`  | enum    | `greater_of` | options: `greater_of`, `actual_only`, `volumetric_only`              |
| `require_tracking_number` | boolean | `true`       |                                                                      |
| `auto_generate_tracking`  | boolean | `false`      |                                                                      |

### `pre_alerts` — label "Pre-alerts", `optional: true`, `enabledByDefault: true`

| key                      | type    | default | notes                                        |
| ------------------------ | ------- | ------- | -------------------------------------------- |
| `customer_can_create`    | boolean | `true`  |                                              |
| `require_invoice_upload` | boolean | `true`  | hint: "Customs requires a supplier invoice." |
| `require_declared_value` | boolean | `true`  |                                              |
| `auto_match_on_tracking` | boolean | `true`  |                                              |

### `warehouse` — label "Warehouse", `optional: false`, `enabledByDefault: true`

| key                      | type    | default | notes          |
| ------------------------ | ------- | ------- | -------------- |
| `auto_notify_on_receipt` | boolean | `true`  |                |
| `storage_free_days`      | integer | `30`    | min 0, max 365 |
| `storage_fee_per_day`    | decimal | `0.00`  | min `0`        |

### `manifests` — label "Manifests", `optional: true`, `enabledByDefault: true`

| key             | type    | default | notes        |
| --------------- | ------- | ------- | ------------ |
| `auto_number`   | boolean | `true`  |              |
| `number_prefix` | string  | `MF-`   | maxLength 10 |

### `deliveries` — label "Deliveries", `optional: true`, `enabledByDefault: true`

| key                       | type    | default         | notes                                     |
| ------------------------- | ------- | --------------- | ----------------------------------------- |
| `allow_branch_pickup`     | boolean | `true`          |                                           |
| `allow_home_delivery`     | boolean | `true`          |                                           |
| `default_delivery_method` | enum    | `branch_pickup` | options: `branch_pickup`, `home_delivery` |
| `require_signature`       | boolean | `true`          |                                           |
| `delivery_fee`            | decimal | `0.00`          | min `0`                                   |

### `invoices` — label "Invoices", `optional: false`, `enabledByDefault: true`

| key                     | type    | default | notes                                                             |
| ----------------------- | ------- | ------- | ----------------------------------------------------------------- |
| `auto_invoice_on_ready` | boolean | `true`  |                                                                   |
| `invoice_prefix`        | string  | `INV-`  | maxLength 10                                                      |
| `payment_terms_days`    | integer | `0`     | min 0, max 180                                                    |
| `tax_inclusive_pricing` | boolean | `false` |                                                                   |
| `gct_rate`              | decimal | `15.00` | min `0`, max `100`. hint: "Jamaica General Consumption Tax rate." |

### `payments` — label "Payments", `optional: false`, `enabledByDefault: true`

| key                              | type    | default | notes |
| -------------------------------- | ------- | ------- | ----- |
| `allow_partial_payment`          | boolean | `true`  |       |
| `require_payment_before_release` | boolean | `true`  |       |

### `portal` — label "Customer portal", `optional: true`, `enabledByDefault: true`

| key                          | type    | default | notes |
| ---------------------------- | ------- | ------- | ----- |
| `self_registration`          | boolean | `true`  |       |
| `require_email_verification` | boolean | `true`  |       |
| `show_rates`                 | boolean | `true`  |       |
| `allow_prealert_create`      | boolean | `true`  |       |

Export from `catalog.ts`:

- `COURIERS_MODULE_CATALOG` — the frozen catalog.
- `COURIERS_MODULE_KEYS` — a readonly string array of the keys, derived from the catalog (do not hand-maintain a second list).
- `isCourierModuleKey(value: string): boolean` — a type guard.

`apps/couriers/src/lib/modules/index.ts` re-exports the catalog module's public surface.

## 4. Important constraint — do NOT add a TRN column

`require_identification` above is only a boolean preference. Sensitive identifiers
(TRN, passport) live in the core identity API's `user_identifications` per
`.claude/rules/customer-architecture.md`, and `CourierCustomerProfile.trn` is
deprecated. Do not add, read, or write any identifier column anywhere in this phase.

## Testing

Per `.claude/rules/testing.md`, in `catalog.test.ts`:

- Every module key except `general` and `portal` exists in `PERMISSION_CATALOG`.
- `defineModuleCatalog` accepts the catalog without throwing (this alone catches a
  duplicate key, a bad enum default, or an out-of-range numeric default).
- `COURIERS_MODULE_KEYS` matches the catalog's module keys exactly, in order.
- `isCourierModuleKey` returns true for `deliveries` and false for `nope` and `''`.
- Spot-assert three specific defaults with full shape: `packages.volumetric_divisor`
  is integer 5000 with min 1000 / max 10000; `invoices.gct_rate` is decimal `'15.00'`;
  `customers.auto_assign_home_branch` is boolean true.
- Every `decimal` default is a **string**, never a number — assert this across the
  whole catalog with a loop, since a numeric decimal default silently loses precision.

## Verification (must pass before reporting done)

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
```

Also confirm the generated Prisma client compiles by ensuring typecheck passes after
`npx prisma generate`.

## Rules

- `.claude/rules/types.md`, `.claude/rules/code-style.md`, `.claude/rules/naming.md`.
- `.claude/rules/sdk-conventions.md` — nothing outside `src/lib/service/` may query
  `prisma`. This phase adds **no** queries at all; that is Phase 3.
- Prettier: single quotes, no semicolons.

## Out of scope

- No service-layer verbs, no route handlers, no UI, no pages. That is Phase 3.
- No changes to `apps/api`, `packages/settings`, or any other app.
- No git commits.
