# Feature Flag Rules

Read this before creating, renaming, evaluating, or seeding any feature flag,
and before adding flag-gated UI or API behavior. It defines the platform-wide
flag key standard so a flag's owner app and group are readable from the key
alone - in PostHog, in the local `features` catalog, and in code.

## Where flags live

- **PostHog** is the provider of record (shared 876 ecosystem project). All flags
  are **server-side-only** keys; flag evaluation never happens in the browser.
- **The API's `features` table** mirrors every flag (slug, parent link,
  `app_id`, provider metadata), synced at startup by the seeds in
  `apps/api/services/feature_seeds.py`. Parent/child is modeled with
  `parent_feature_id`.
- **Apps evaluate** through `$876.features.evaluate({ appId, userId })` —
  never by calling PostHog directly from a Next.js app.
- The **same key string** is used in PostHog, the `features.slug` column,
  and every code reference. Never let them drift; a rename touches all three
  plus the seeds.

## Key format

```
<app>_<feature>            standalone flag        console_theme_switcher
<app>_<group>              group master flag      console_widgets
<app>_<group>_<child>      group child flag       console_widgets_notes
```

- **snake_case, lowercase only**.
- **`<app>` is the platform app slug without the `876-` prefix**: `console`,
  `app` (consumer), `enterprise`, `couriers`, `billing`. A flag that genuinely
  spans every surface uses `platform_` — rare; default to per-app.
- **Never create an unscoped key** (`widgets`, `search_bar`). A "widgets"
  feature in Console and a "widgets" feature in Couriers are different
  products with different rollouts — each app gets its own flag, even for a
  similar feature. Do not share one flag across apps.
- Keys are permanent identifiers: renaming later means coordinated updates in
  PostHog, the DB, seeds, and code. Pick the scoped name up front.

## Parent / child groups

A **group master flag** (`<app>_<group>`) is the kill switch for the whole
group; **child flags** (`<app>_<group>_<child>`) gate individual members.

- Effective child state = master enabled **AND** child enabled. If the master
  is off, no child is evaluated as on (see
  `apps/console/src/lib/features.ts` for the reference implementation).
- The child key is always `master key + _ + child name` — the master key is
  the literal prefix of every child key. No other prefix scheme.
- In the DB, children carry `parent_feature_id` pointing at the master row;
  the seeds set this automatically for grouped seeds.
- An unconfigured child (widget exists in code, no flag yet) defaults to
  enabled when the master is on; create the child flag when you need to gate
  it independently.

## Adding a flag

1. Add it to the owning app's seed list in
   `apps/api/services/feature_seeds.py` — inside an existing group, as a new
   group (master first), or as a standalone entry. The seed creates it in
   PostHog (server-side-only) and syncs the local catalog on API startup.
2. If it gates Console UI grouped by the features admin page, add the group /
   items to `FEATURE_GROUPS` in `apps/console/src/lib/feature-groups.ts`.
3. Reference the key in app code via a named constant, not a scattered string
   literal (e.g. `WIDGETS_FEATURE_SLUG` in `apps/console/src/lib/features.ts`).
4. Flags created ad hoc in the Console features UI must still follow this key
   format — the format is the contract, not the creation path.

## Do not

- Do not create or evaluate a flag key without an app (or `platform_`) prefix.
- Do not evaluate flags client-side or expose PostHog keys to the browser.
- Do not encode team names, ticket numbers, or dates into keys.
- Do not fake a group by naming convention alone in new code paths — thread
  the master check (master AND child), and set `parent_feature_id` via seeds.
