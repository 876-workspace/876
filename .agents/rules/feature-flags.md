# Feature Flag Rules

Read this before creating, renaming, evaluating, or seeding any feature flag,
and before adding flag-gated UI or API behavior. It defines the platform-wide
flag key standard so a flag's owner app and group are readable from the key
alone—in PostHog, in the local `features` catalog, and in code.

This rule is subordinate to `.agents/rules/naming.md`: 876-owned machine-readable
string values use kebab-case. Feature flags are durable 876-owned identifiers.

## Where flags live

- **PostHog** is the rollout provider of record for the shared 876 ecosystem
  project. Flag evaluation is server-side; app code does not call PostHog from
  the browser.
- **Core's `features` table** mirrors every flag (`slug`, parent link, `app_id`,
  provider metadata). The authoritative seed/migration implementation is
  `apps/api/src/seeds/features.ts`.
- **Apps evaluate** through the platform/workspace feature resource, never by
  calling PostHog directly from a Next.js app.
- The **same canonical key** is used in PostHog, `features.slug`, module-plan
  references, widget metadata, and runtime checks.

## Canonical key format

```text
<app>-<feature>             standalone flag       console-theme-switcher
<app>-<group>               group master flag     console-widgets
<app>-<group>-<child>       group child flag      console-widgets-notepad
platform-<group>-<child>    cross-app flag        platform-widgets-notepad
```

Rules:

- lowercase **kebab-case only** for new/canonical keys;
- `<app>` is the product prefix, normally the platform app slug without `876-`:
  `console`, `app`, `enterprise`, `couriers`, `billing`, `crm`;
- genuinely cross-app flags use `platform-`;
- never create unscoped keys such as `widgets` or `search-bar`;
- do not encode ticket numbers, dates, employee/team names, or mutable labels;
- reference canonical keys through named constants/catalog metadata when a flag
  is used more than once.

Underscore feature keys such as `console_widgets` are legacy identifiers only.
They may appear in an explicit compatibility/migration alias list until that
migration is verified; they must not be emitted by new seeds or writes.

## Parent / child groups

A group master (`<app>-<group>`) is the kill switch for the whole group. A child
(`<app>-<group>-<child>`) gates one member.

- Effective child state = master enabled **AND** child enabled.
- A child key must literally extend the master key with `-<child>`.
- In Core, children carry `parent_feature_id` pointing at the master row.
- Parent seeds must appear before children so the seed can bind the stable
  parent feature ID.
- An unconfigured child must not be invented at runtime. Add the seed/catalog
  entry when independent gating is required.

## Creating a flag

1. Add the canonical key to the owning seed list in
   `apps/api/src/seeds/features.ts`.
2. Add parent/group metadata there when applicable.
3. Add/update any plan-module `featureSlug`, widget metadata, feature-group UI,
   and app runtime consumer in the same change.
4. Add tests asserting canonical key spelling and group behavior.
5. Run the seed explicitly using the documented seed CLI. Express services do
   not run seed/DDL work at startup.

## Renaming an existing flag

A feature key is a durable contract. Do **not** rename it as a normal refactor
and never mass-replace `_` with `-` in PostHog or SQL.

For a controlled rename:

1. Put the new canonical key in the seed's `slug`.
2. List each exact historical key in `legacySlugs`.
3. Update runtime consumers to read the canonical key. During an overlapping
   rollout, temporarily dual-read the exact legacy aliases as well.
4. Run preflight checks for a collision where both canonical and legacy flags
   exist. A collision is an operator decision; code must fail rather than pick a
   winner.
5. Run the feature seed. The seed renames the existing PostHog flag **in place**,
   then renames the existing Core row while preserving its feature ID, grants,
   parent relationships, and provider identity.
6. Verify there are no legacy provider/local slugs and that parent/child links,
   org/user grants, plan-module references, and app evaluations still resolve.
7. Remove temporary dual-read aliases only in a later cleanup after every
   environment has completed the migration.

`copyStateFromSlug` is different from `legacySlugs`: it names a **canonical**
existing feature whose rollout/grant state initializes a genuinely new flag.
The source must be seeded before the destination.

## Migration collision rule

If PostHog or the local catalog contains both `console_widgets` and
`console-widgets`, or more than one historical alias for a canonical feature,
do not merge automatically. Stop the seed, compare state/grants/provider IDs,
select the authoritative row explicitly, and rerun only after the collision is
resolved.

## Evaluation and sync

- PostHog supplies rollout evaluation for identified server-side calls.
- Local governance is applied on top: local kill switch, organization/user
  grants, parent checks, and module/entitlement rules still win.
- Evaluation fails closed when the owning app cannot load a reliable flag set.
- The background sync mirrors provider state; it does not invent arbitrary
  feature keys.
- During the naming migration, temporary legacy reads are allowed only through
  an explicit alias map. New seeds and provider/local writes remain canonical.

## Managing flags in Console

An admin should not need PostHog to perform normal platform feature management.
Console should expose the local/provider concepts the platform owns.

Precedence remains:

```text
feature.enabled     global kill switch
      ↓
app scope           product ownership
      ↓
OrgFeature          organization override
      ↓
UserFeature         user override
```

An override never revives a globally disabled flag. Parent/child gating applies
on top.

UI rules:

- group by app plus an "All apps"/platform section;
- render children under their parent master;
- list principals that actually have overrides rather than enumerating the
  entire user/org directory;
- one control represents one real flag, not several hidden provider keys;
- keep targeting next to the flag whose state it changes.

## Do not

- Do not create snake_case canonical feature keys.
- Do not derive migration aliases with an algorithmic `_`/`-` replacement.
- Do not create or evaluate an unscoped feature key.
- Do not evaluate PostHog directly in browser code.
- Do not mutate a provider key without migrating the matching local catalog and
  consumers.
- Do not silently merge canonical/legacy collisions.
- Do not keep legacy aliases forever; every compatibility read needs a removal
  point after environment verification.
