# Phase 1 — Promote the CRM settings hub to a shared `@876/ui` pattern

**Model:** `gpt-5.6-terra`, `model_reasoning_effort=high`
**Repo:** `/root/projects/876` (pnpm monorepo). **Branch:** `feature/app-access-adoption` — already checked out. Do not create, switch, merge, rebase, or delete any branch.
**Do not commit.** The orchestrator stages and commits. Leave your work in the working tree.

## Why

Three apps each render a settings hub with a different heading size, a different
card, and a different grid. CRM's is the best of the three and is being made the
platform standard — but it currently violates two written rules, so it is fixed
*as part of* the promotion, not afterwards.

## Read first (they are binding)

- `CLAUDE.md` → "UI Copy" — no explanatory `<p>` under a page/section heading.
- `.claude/rules/app-layout.md` §10b (one page-title size, `876-page-title`) and §10c (settings hub uses CSS multi-column).
- `.claude/rules/app-structure.md` — no barrels; `components/patterns/` is a waiting room; promote to `packages/ui` once a second app needs it.
- `.claude/rules/code-style.md`, `.claude/rules/types.md`, `.claude/rules/testing.md`.

## Scope — exactly these files

### 1. New shared component: `packages/ui/src/components/settings-hub.tsx`

`@876/ui/<name>` resolves to `src/components/<name>.tsx` through the package's
`"./*"` export, so **no `package.json` change is needed**. Do not add one.

Port `apps/crm/src/app/(app)/settings/_components/settings-group-card.tsx` and the
presentational half of `apps/crm/src/app/(app)/settings/_lib/settings-nav.ts`.

Export from `settings-hub.tsx`:

```ts
export type SettingsAvailability = 'available' | 'planned'

export type SettingsHubItem = {
  label: string
  /** Icon key, resolved inside this component. Never a component — this data
   *  crosses the RSC boundary. */
  icon: SettingsHubIconKey
  availability: SettingsAvailability
  href?: string
}

export type SettingsHubGroup = { label: string; items: SettingsHubItem[] }

export function SettingsHub({ groups }: { groups: SettingsHubGroup[] }): ReactElement
export function SettingsHubGroupCard({ group }: { group: SettingsHubGroup }): ReactElement
```

`SettingsHubIconKey` is a union of string keys. Carry over CRM's eight
(`automation`, `categories`, `email`, `members`, `preferences`, `priorities`,
`statuses`, `teams`) and add the keys Billing and Invoice need — at minimum
`access`, `banking`, `compliance`, `currencies`, `documents`, `integrations`,
`items`, `payments`, `roles`, `taxes`, `templates`. Give each an icon from
`@876/ui/icons` plus the same `{ bg, text, border }` tint triple CRM uses; reuse
CRM's existing colours for its existing keys unchanged.

Requirements:

- **`SettingsHub` renders the multi-column layout** required by §10c:
  `columns-1 sm:columns-2 lg:columns-3` with `break-inside-avoid` + `mb-6` on each
  card. Do **not** use a grid. Do not hand-assign cards to columns.
- Icon keys are resolved to components **inside** this file. The `groups` prop must
  stay structurally cloneable — string keys only, no components, no functions.
- Keep CRM's existing card visuals: `876-card`, bordered header with the group
  label, `divide-y` item list, tinted `size-8` icon tile, `Planned` badge for
  planned items, `ChevronRightIcon` for available ones.
- An item with `availability: 'available'` and no `href` renders as planned. Do not
  throw and do not render a dead link.
- No `'use client'` — this is presentation only and must render as a server component.

### 2. `packages/ui/src/components/settings-hub.test.tsx`

**At least 14 `it()` cases.** Cover, with real assertions:

- every group renders with its label;
- an available item with an href renders a link to that href;
- a planned item renders no link and shows the `Planned` badge;
- an available item **without** an href renders no link (the guard above);
- an empty `groups` array renders no cards and does not throw;
- a group with zero items renders its label and an empty list;
- every icon key in the union resolves to an element (drive it from the exported
  key list, not a hand-copied literal, so a new key cannot be added untested);
- the rendered container carries the `columns-*` classes, not `grid`;
- each card carries `break-inside-avoid`;
- item order within a group is preserved exactly as passed;
- group order is preserved exactly as passed;
- the component does not mutate the `groups` array it is given;
- a duplicate label across two groups renders both;
- a label containing markup-like text (`<script>alert(1)</script>`) renders as text.

### 3. CRM — adopt, and fix the two violations

`apps/crm/src/app/(app)/settings/page.tsx`:

- **Delete the description paragraph** under the `<h1>` ("Configure teams, routing
  categories, …"). It restates the cards below it.
- The `<h1>` becomes `className="876-page-title"` — remove `text-lg font-semibold tracking-tight`.
- Replace the inline `grid` + `SETTINGS_GROUPS.map(...)` with `<SettingsHub groups={...} />`.

`apps/crm/src/app/(app)/settings/_lib/settings-nav.ts`:

- Keep this file as CRM's own **data** (`SETTINGS_GROUPS`), retyped to
  `SettingsHubGroup[]` imported from `@876/ui/settings-hub`.
- Delete `SETTINGS_ITEM_CONFIG`, `SETTINGS_ICON_RESOLVER`, the local `Icon` type,
  and every `@876/ui/icons` import — those now live in the shared component.
- Update `settings-nav.test.ts` to match. Do not weaken an existing assertion to
  make it pass; if an assertion no longer applies, delete it and say so in the report.

**Delete** `apps/crm/src/app/(app)/settings/_components/settings-group-card.tsx`.
Fix every importer. Nothing may still import it.

### 4. Billing — adopt

`apps/billing/src/app/(app)/settings/(list)/page.tsx`:

- **Delete the description paragraph** under the `<h1>` and the per-card
  `<p>{section.description}</p>` — both are the prose `CLAUDE.md` forbids.
- `<h1 className="876-page-title">Settings</h1>`.
- Render `<SettingsHub groups={...} />`.
- Keep `requirePagePermission('settings:read')` and
  `getVisibleSettingsSections(context.permissions)` **exactly as they are** — this
  phase does not touch Billing's permission plane. Map the visible sections into
  `SettingsHubGroup[]` in the page (or a `_lib/settings-hub-groups.ts` beside it),
  converting each section's icon **component** into a string icon key. If a
  section's icon has no matching key, add the key to the shared union — do not pass
  the component through.
- Group the sections sensibly (e.g. `Workspace`, `Money`, `Access`, `Compliance`).
  Use the section data already in `apps/billing/src/components/shell/nav-config.ts`;
  do not invent settings pages that do not exist.
- `apps/billing/src/app/(app)/settings/(list)/loading.test.tsx` and `loading.tsx`
  exist. Keep the fallback consistent with the new hub shape — if the hub is static
  chrome with no I/O, the loading file should not skeleton it into a grey grid.

### 5. Invoice — replace the placeholder

`apps/invoice/src/app/(app)/settings/page.tsx` is currently a "Coming soon"
placeholder. Replace it with:

- `export const metadata = { title: 'Settings' }`
- a `<Page hub>` wrapper (import `Page` from `@876/ui/page`), matching CRM
- `<h1 className="876-page-title">Settings</h1>`, no description paragraph
- `<SettingsHub groups={SETTINGS_GROUPS} />` with groups declared in
  `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts`

Invoice has no settings sub-routes yet, so **every item is `availability: 'planned'`
with no href**, except `Users` — declare it `planned` for now; Phase 4 turns it on.
Suggested groups, all planned: **Workspace** (Users, Preferences), **Sales**
(Templates, Numbering), **Money** (Payment modes, Taxes). Do not create the routes.

Add `apps/invoice/src/app/(app)/settings/_lib/settings-nav.test.ts` with at least
4 cases: every item has a label and a valid icon key; no item is `available`
without an href; group labels are unique; the exported list is non-empty.

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `as any`.** Use `as unknown as T` only
  at a genuine external boundary, and justify it in the report.
- Do not weaken production code to make a test easier (no making a required prop
  optional, no removing a heading).
- Do not add a barrel `index.ts` anywhere.
- Do not touch `apps/console`, `apps/couriers`, `apps/api`, `packages/core`,
  `packages/access-ui`, or anything under `apps/*/src/lib/auth/`.
- Do not touch Billing's `service.roles` / `service.members` or any permission
  logic. Phase 5 owns that.
- Do not modify `packages/ui/package.json`.
- Do not run `git commit`, `git push`, or any branch operation.

## Verification you must run and report

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/crm typecheck
pnpm --filter @876/crm test
pnpm --filter @876/billing-app typecheck
pnpm --filter @876/invoice-app typecheck
node scripts/check-app-structure.mjs
```

Confirm the exact workspace names from the `package.json` `name` fields before
running; if one differs, use the real one and say so.

## Report

Write `plans/2026-09-02-app-access-adoption/reports/codex/2026-09-02-phase-1-shared-settings-hub.md`:

- a file-by-file table of what changed and why;
- the **counted** number of `it()` cases you added per file;
- the full output tail of each verification command, and whether it passed;
- anything you could not do, and why — a truthful "not done" is worth more than a
  confident claim;
- every judgement call the brief did not settle (icon key names, Billing grouping);
- anything you found that contradicts this brief.
