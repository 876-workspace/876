# Organization Module Settings

Read this before adding, storing, reading, or rendering **any organization-level
setting or preference** in any 876 SaaS app. This rule is subordinate to
`.claude/rules/naming.md`: 876-owned machine-readable identifiers use kebab-case;
TypeScript/876-owned JSON properties use camelCase; physical SQL identifiers keep
their existing snake_case names.

## The three layers

An organization's configuration lives on three layers with different owners and
lifecycles:

| Layer            | Question                                  | Owner                 | Writer                         |
| ---------------- | ----------------------------------------- | --------------------- | ------------------------------ |
| **Provisioning** | What must exist before the app works?     | Core provisioning     | Platform manifest/materializer |
| **Modules**      | Which functional areas is this org using? | Product app datastore | Org admin                      |
| **Preferences**  | How should an enabled module behave?      | Product app datastore | Org admin                      |

Provisioning is a published/versioned platform contract. Module state and
preferences are app-local operational configuration. Do not collapse these
layers.

## Fixed terminology

- **Module** — a functional area an org may use (`deliveries`, `pre-alerts`).
- **Preference** — one typed, defaulted value belonging to one module.
- **Catalog** — the app's code declaration of modules/preferences.
- **Default** — catalog value used when no override exists.
- **Override** — a stored row differing from the default.
- **Readiness** — post-provisioning setup guidance; not sign-up onboarding.

A module is not a feature flag. Feature flags are platform-controlled rollout;
module state is organization-controlled product usage. A flag may hide a module;
a module toggle cannot override a disabled rollout flag.

## Storage ownership

Module state and preferences live in the **owning app's datastore**, tenant
scoped. They do not belong in the Core identity store. References to Core users
or organizations are opaque IDs without cross-database foreign keys.

`@876/settings` owns shared types/validation/resolution logic only. It does not
own app persistence.

## Canonical module identity

When the same functional module is referenced by more than one architectural
plane, stable identity is declared once in `@876/core/modules` and projected into
the plane that needs it.

The canonical identity owns only:

- application membership;
- durable module `key`;
- human `label`;
- human `description`.

Concern-specific data remains with its existing owner:

- a settings catalog adds `optional`, `enabledByDefault`, and preferences;
- Core `application_modules` materializes the commercial subset used by plans;
- permission catalogs add actions and reuse canonical identity only when the
  permission grouping has the same semantics;
- feature flags remain rollout/kill switches;
- provisioning remains a separate platform contract.

Repeating the canonical **key as a reference** is expected. Re-declaring the
same module label/description in another catalog is not. Do not create a second
module taxonomy merely because a permission group, settings surface, and plan
need different extra fields.

A product-local module that exists in only one plane may remain in that product's
catalog. Promote its identity to `@876/core/modules` when a second real plane
needs the same stable concept; do not pre-build registry entries for hypothetical
future use.

Canonical identity does not move organization module state/preferences into Core
and does not make every permission/navigation group commercially sellable.
Semantic equality is required before two planes share an identity.

## Canonical identifier contract

Module keys, preference keys, and 876-owned reference namespaces are lowercase
kebab-case:

```text
pre-alerts
volumetric-divisor
auto-assign-home-branch
package-category
```

The shared package enforces:

```text
^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$
```

A module key must match the corresponding permission-catalog module key where
one exists so `<module>.view` / `<module>.edit` can gate its settings surface.

These are durable persisted identifiers. Do not rename them as ordinary
refactors. A rename requires an exact old→new mapping across catalog consumers,
stored rows, permission arrays, routes/SDKs where applicable, tests, and
provisioning references. Never derive migrations with a blanket underscore to
hyphen replacement.

Historical underscore identifiers may exist only in explicit migrations or
temporary compatibility reads with a documented removal point. New writes are
canonical only.

## Preference value types

The supported types are:

`boolean` · `string` · `enum` · `integer` · `decimal` · `reference`

- Decimal values remain strings end-to-end to avoid precision loss.
- A reference carries a namespace plus a referenced key.
- Enum values that are themselves 876-owned symbolic values use kebab-case.
- Free-form/customer-authored string values are **not** normalized merely
  because they contain underscores or spaces.

## Physical storage shape

The mature SQL schema may remain snake_case. A typical override table contains
physical columns such as:

```text
tenant_id · module · key · value_type
string_value · integer_value · decimal_value · boolean_value
reference_namespace · reference_key
updated_by · created_at · updated_at
UNIQUE (tenant_id, module, key)
```

This is a database-boundary exception, not permission to expose snake_case from
new TypeScript/876 JSON contracts.

Store one row per **override**. Never persist a row equal to the catalog default;
absence means “use the current default.” Module state uses its own table and a
missing row means `enabledByDefault`, not disabled.

## Resolution

```text
catalog default → stored override → resolved value
```

Resolution must degrade malformed/stale persisted rows to the catalog default
instead of crashing the settings surface.

## Migration safety

For a persisted key rename:

1. inventory the exact old values and tables/arrays/JSON that store them;
2. add collision checks for old and canonical identities coexisting;
3. add temporary compatibility reads only when deployment ordering requires it;
4. migrate the data using explicit mappings;
5. switch all new writes/catalogs to canonical values;
6. verify no old values remain;
7. remove compatibility reads only after every environment is confirmed migrated.

Do not rewrite customer-authored values, opaque IDs, referenced-record keys, or
physical table/column names.

## Settings navigation

Settings navigation crosses the RSC boundary and therefore remains plain data:
string icon keys, no React components/functions. Available items carry an href;
planned items do not. Module settings URLs use the canonical module key in the
route segment, e.g. `/settings/modules/pre-alerts`.

## Readiness and defaults

Prefer deriving a useful default from already-known organization data over
forcing setup. Readiness may be `required`, `recommended`, or `optional`; truly
mandatory platform state generally belongs in provisioning instead.

## Applying this to a new app

1. Depend on `@876/settings`.
2. Declare a canonical kebab-case settings module catalog. If the same module
   identity is consumed by another real plane, reuse or add its
   `@876/core/modules` identity instead of copying labels/descriptions.
3. Align settings keys with permission-catalog module keys where the semantics
   match and add anti-drift tests.
4. Add tenant-scoped module-state and typed preference override tables.
5. Keep physical SQL names mapped through Prisma while application fields are
   camelCase.
6. Expose module/preference resources through the app's normal service/SDK
   boundary.
7. Declare RSC-safe settings navigation and readiness requirements.
8. Add migration tests whenever a durable key changes.

Reference implementations: the Couriers module/preferences implementation for
app-local state and the Billing/Invoice canonical Finance registry for a module
identity projected across settings, access, and commercial entitlement planes.
