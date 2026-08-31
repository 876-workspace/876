# Organization Module Settings

Read this before adding, storing, reading, or rendering **any organization-level
setting or preference** in any 876 SaaS app — couriers, billing, enterprise, and
every future product app. It fixes the terminology, the placement, and the
contract so a new app inherits the whole pattern instead of inventing a fourth
one. Companion to `.claude/rules/platform-services.md` (three-bucket placement),
`.claude/rules/sdk-conventions.md` (client surface), and
`.claude/rules/app-layout.md` (the settings pages themselves).

## The three layers, and why settings is not provisioning

An organization's configuration lives on three layers. They are **different
layers with different lifecycles** — collapsing them is the mistake this rule
exists to prevent.

| Layer            | Question it answers                           | Owner                                       | Who writes it              | When                |
| ---------------- | --------------------------------------------- | ------------------------------------------- | -------------------------- | ------------------- |
| **Provisioning** | What **must exist** before the app works?     | Core API (`apps/api/domains/provisioning/`) | Platform, via a manifest   | At org provisioning |
| **Modules**      | Which parts of the app is this org **using**? | The app's own datastore                     | The org admin, in Settings | Any time after      |
| **Preferences**  | **How** should an enabled module behave?      | The app's own datastore                     | The org admin, in Settings | Any time after      |

Provisioning is a **published, versioned manifest** the platform controls; an org
cannot opt out of it. Modules and preferences are **org-editable** and always have
a working default, so an org that never opens Settings still has a functioning app.

> If a value is mandatory for the app to function at all, it belongs in the
> provisioning manifest, not in module preferences. If an org could reasonably
> want it different from the next org, it is a preference.

## Fixed terminology

| Term           | Meaning                                                                                     | Never call it                      |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Module**     | A functional area of the app an org can enable/disable (`deliveries`, `items`, `packages`). | "feature" (that is a feature flag) |
| **Preference** | One typed, defaulted, org-editable value belonging to exactly one module.                   | "setting" when precision matters   |
| **Catalog**    | The app's declaration of its modules and their preferences. Code, not data.                 | "schema"                           |
| **Default**    | The value in the catalog. Used whenever no row is stored.                                   | —                                  |
| **Override**   | A stored row. Only written when it differs from the default.                                | —                                  |
| **Readiness**  | The post-provisioning "you still need to set up X" checklist.                               | "onboarding" (that is sign-up)     |

**A module is not a feature flag.** A feature flag (`.claude/rules/feature-flags.md`)
is _platform-controlled rollout_ — 876 decides who gets it, via PostHog. A module is
_org-controlled usage_ — the customer decides whether they use it. A flag can hide a
module from every org; a module toggle cannot enable something the flag has disabled.
Never model a rollout as a module, and never model a customer choice as a flag.

## Placement — always the app's own datastore

By decision step #2 of `.claude/rules/platform-services.md`, module state and
preferences are **app-local operational data**: internal to exactly one app and
meaningless to the rest of the platform. Couriers' volumetric divisor means nothing
to Billing.

- Storage lives in the **app's own datastore**, tenant-scoped.
- It **must not** go in the core identity API. The identity API owns who a user/org
  _is_, not how one app behaves for them.
- Any reference to a core entity (`updatedBy` = an 876 user id) is an **opaque ID
  column with no cross-database foreign key**.
- Reads and writes go through the app's `service.<resource>.<verb>()` layer — the
  only caller allowed to touch `prisma` (`.claude/rules/sdk-conventions.md`).

## The shared contract: `@876/settings`

The **contract** is shared; the **storage** is not. `packages/settings` is pure
types and logic — no React, no Prisma, no Next.js, no app imports, `zod` only. Every
app builds its own catalog on it and persists rows in its own tables.

That split is the whole design. A shared package that owned storage would force one
database on every app; a per-app contract would let each app drift. This gives one
vocabulary and N datastores.

### Preference value types

Six types, deliberately mirroring the platform provisioning property model so both
layers speak the same value vocabulary:

`boolean` · `string` · `enum` · `integer` · `decimal` · `reference`

- **A `decimal` is a string end-to-end** — in the catalog default, in the Zod schema,
  in the storage column, in the resolved value. Never a JS number. Money and rates
  lose precision through a float, and a `15.00` GCT rate that becomes `15.000000001`
  is a billing defect.
- A `reference` carries a `namespace` plus a key (`currency` → `JMD`,
  `package_category` → `general`), so a preference can point at another record
  without a foreign key.

### Storage shape

One row per **override**, with typed columns — exactly one populated per row, except
`reference` which uses namespace + key together:

```
tenant_id · module · key · value_type
string_value · integer_value · decimal_value · boolean_value
reference_namespace · reference_key
updated_by · created_at · updated_at
UNIQUE (tenant_id, module, key)
```

**Never write a row for a value equal to the default.** Absence means "use the
default", which is what lets a catalog default be changed later and take effect for
every org that never overrode it. Writing defaults freezes them permanently.

Module state is its own table (`tenant_id · module · is_enabled`), and a missing row
means "use the catalog's `enabledByDefault`" — **absence is not "disabled"**.

### Resolution order

```
catalog default  →  stored override  →  resolved value
```

Resolution never throws. A stored row whose `value_type` no longer matches the
catalog, or whose typed column is null, **degrades to the default** — a definition
that changed shape must not crash a settings page for every org that saved the old
one.

## Module keys reuse the permission catalog

A module key **must** match the app's permission-catalog module key where one
exists, so `<module>.view` / `<module>.edit` already gate that module's settings page
with no new permission vocabulary. Add a test asserting the two catalogs cannot
drift — that test is the only thing that keeps them aligned over time.

Keys are `^[a-z][a-z0-9_]*$`. They are permanent identifiers: renaming one orphans
every stored row for every org.

## Settings navigation must be RSC-serializable

The settings nav is data that crosses the React Server → Client boundary, so it
carries **no icon components and no functions** — only plain data, with a **string
icon key** the app resolves to a component itself. This is the same technique
`ResourceToolbar`'s `DropdownAction.icon` already uses (`.claude/rules/app-layout.md`).

A registry with imported icon components appears to work right up until the first
client component needs it, then fails at the boundary. Do not put components in it.

Items declare `status: 'available' | 'planned'`. A `planned` item renders as plain
text with no link and **must not** carry an `href`; an `available` item **must**.
This is what lets the full information architecture ship before every page is built,
without dead links.

## Readiness — below provisioning, above nothing

Readiness is the "finish setting up your workspace" surface. Three severities:

- **`required`** — the app is not usable until this is done. Rare; most genuinely
  required things belong in provisioning instead.
- **`recommended`** — the app works, but a real workflow is degraded. Branches are
  the canonical example: packages route to a default branch, so an org that never
  configures one still works, but multi-branch pickup does not.
- **`optional`** — nice to have.

`evaluateSetup()` is **pure and data-only** — it takes requirements plus a list of
satisfied keys and returns a plain object. No callbacks, so the result passes safely
from a server component to a client component.

## Seed a working default instead of demanding setup

Where a required record can be **derived** from data the platform already holds,
derive it at provisioning time rather than blocking the org on a form.

Canonical instance: an org's **default branch is seeded from the organization's
primary location/address** (the org profile already carries `address_line1/2`,
`city`, `region_id`, `country_code`). A single-location courier never has to create a
branch; a multi-branch one adds more later. The seed marks `isDefault`, and the
readiness task for branches is `recommended`, not `required`.

Apply the same reasoning to every new "the org must configure X" requirement: ask
first whether X can be defaulted from something already known.

## Do not

- Do not store module preferences in the core identity API.
- Do not add a cross-database foreign key from a preference row to a core entity.
- Do not write a stored row for a value equal to its catalog default.
- Do not treat a missing module row as "disabled" — it means "use the default".
- Do not model a platform rollout as a module, or a customer choice as a feature flag.
- Do not carry a `decimal` as a JS number anywhere in the chain.
- Do not put icon components or functions in the settings nav registry.
- Do not give a `planned` nav item an `href`.
- Do not let resolution throw on a stale or malformed stored row.
- Do not invent a module key that has no matching permission-catalog module.
- Do not query `prisma` outside the app's `service/` layer to read or write these.

## Applying this to a new app

1. Depend on `@876/settings`.
2. Declare the app's catalog with `defineModuleCatalog`, reusing its permission
   module keys, and add the anti-drift test.
3. Add the two tenant-scoped tables with the typed value columns above.
4. Add `service.modules.*` and `service.preferences.*` verbs; mutations return the
   app's `ServiceResult` envelope, reads return plain values.
5. Declare the settings nav with `defineSettingsNav`, string icon keys, and
   `status` on every item.
6. Declare readiness requirements, defaulting anything derivable rather than
   requiring it.

Reference implementation: `apps/couriers`.
