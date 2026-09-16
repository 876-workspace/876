# Brief — Phase 3: Org module catalogs for 876 Billing and 876 Invoice

**Read `.agents/rules/gpt-web-operating-rules.md` first.** It is your standing
policy: no branches, no PRs, no shell, no claimed test runs, no AI attribution,
retry transient connector failures, report honestly.

- **Branch:** `feature/finance-apps` (already exists on the remote). Commit
  only there.
- **Concurrency:** two Codex agents are working in this tree at the same time,
  on `packages/billing-ui/**`, both apps' `customers/**`,
  `apps/billing/src/app/(app)/settings/users/**`,
  `apps/billing/src/app/api/app-memberships/**`, and
  `packages/access-ui/**`. **Do not touch any of those paths.** Pull before you
  start and again before your final commit.

## Rules to read before writing code

1. `.agents/rules/module-settings.md` — **the governing rule.** Read it in
   full; it owns storage, resolution, and migration for everything here.
2. `.agents/rules/finance-app-parity.md` — the Modules section.
3. `.agents/rules/naming.md` — kebab-case durable identifiers.
4. `.agents/rules/app-layout.md` — §10c settings hub layout.
5. `.agents/rules/access-control.md` — module keys must match permission keys.
6. `.agents/rules/testing.md`.

## Verified baseline — confirm each before depending on it

- `packages/settings` exists and exports the catalog, preference, nav, and
  readiness primitives (`packages/settings/src/`).
- **Neither `apps/billing` nor `apps/invoice` depends on `@876/settings`.**
  Only `apps/couriers`, `apps/couriers-api`, `packages/crm`, and
  `packages/couriers` do. Confirm this in the `package.json` files.
- The reference implementation is
  `packages/couriers/src/settings-catalog.ts` (the shared catalog) plus
  `apps/couriers/src/lib/modules/{catalog,index}.ts` (the app-local key set and
  type guard) and
  `apps/couriers/src/app/api/manage/settings/modules/{route.ts,[moduleKey]/route.ts}`.
- `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts` already exists and
  has a test beside it. Billing's settings landing page lives at
  `apps/billing/src/app/(app)/settings/(list)/`.

If any of these is wrong, **stop and report it** rather than building around
it.

## Goal

Give both finance apps a declared, typed, tested org module catalog — the layer
that decides _which functional areas an org is using_ — before the features
themselves are built. A module is org-controlled usage. A feature flag is
platform-controlled rollout. They are not the same thing and must not be
conflated.

## Phase 3a — the shared catalog

Create `packages/billing/src/settings-catalog.ts`, mirroring
`packages/couriers/src/settings-catalog.ts` in shape exactly.

Module keys — canonical kebab-case, durable persisted identifiers:

**Shared by both apps:**
`invoices` · `quotes` · `payments` · `expenses` · `items` ·
`sales-receipts` · `time-tracking` · `customers`

**Billing only:**
`subscriptions` · `banking` · `credit-notes` · `purchases` · `payroll` ·
`price-lists` · `discounts`

Export them as two named catalogs — `BILLING_MODULE_CATALOG` and
`INVOICE_MODULE_CATALOG` — where the Invoice catalog is derived from the shared
subset rather than retyped, so a shared key cannot drift between the two.

Each module carries at least: `key`, `label`, `description`, and
`enabledByDefault`. Preferences are **out of scope for this phase** — declare
the module shape only. Do not invent preference keys for features that do not
exist.

Add `@876/settings` to `packages/billing`'s dependencies.

## Phase 3b — app-local catalogs

For each of `apps/billing` and `apps/invoice`, create
`src/lib/modules/{catalog.ts,index.ts}` following
`apps/couriers/src/lib/modules/` exactly: re-export the shared catalog, derive
the key union, expose the readonly key list and an `is<App>ModuleKey` type
guard.

Add `@876/settings` to both apps' `package.json` dependencies.

## Phase 3c — anti-drift test

Add a test per app asserting:

- every module key matches `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`;
- keys are unique within a catalog;
- every key shared by both catalogs has an **identical label and description**
  in both — this is the test that keeps the two apps in sync;
- Invoice's catalog is a strict subset of Billing's;
- the Billing-only keys listed above are absent from Invoice.

## Phase 3d — settings navigation

Add a **Modules** entry to each app's settings landing page, following
`.agents/rules/app-layout.md` §10c (CSS multi-column, `break-inside-avoid`, no
hand-assigned grid) and `.agents/rules/module-settings.md`'s navigation
contract: settings navigation crosses the RSC boundary, so it stays **plain
data** — string icon keys, no React components, no functions.

A module settings item is titled `"<Module> settings"`, never the bare module
label — the bare label collides with the records it governs.

Invoice's nav file is `apps/invoice/src/app/(app)/settings/_lib/settings-nav.ts`
(update it and its test). Billing's landing page is under
`apps/billing/src/app/(app)/settings/(list)/` — read it and follow whatever
pattern it already uses; do not impose Invoice's shape on it.

## Phase 3e — the modules surface

Add, in each app:

- `src/app/(app)/settings/modules/page.tsx` — lists the app's modules with
  their enabled state.
- `src/app/(app)/settings/modules/[moduleKey]/page.tsx` — one module's settings
  page. It calls `notFound()` for a key the type guard rejects.

Route segments use the **canonical module key**
(`/settings/modules/pre-alerts`, never `pre_alerts`).

**Persistence is out of scope for this phase.** There is no module-state table
in either app yet. Render each module's `enabledByDefault` and make the state
control visibly non-interactive, with the reason stated in a code comment —
**not** in a paragraph under the heading (`CLAUDE.md` → UI Copy forbids
explanatory prose under a section header). Do not write a fake toggle that
silently discards the change, and do not invent a datastore.

## Test floor

**At least 26 `it()` cases** across the phases, counted literally:

- ≥ 10 on the catalogs and the anti-drift assertions above;
- ≥ 4 on each app's type guard, including the negative space: an unknown key,
  an underscore key, an empty string, and a key from the _other_ app's
  Billing-only set;
- ≥ 4 on the settings nav additions (entry present, correct href, plain-data
  serializability — no functions or components in the exported nav);
- ≥ 4 on the `[moduleKey]` route calling `notFound()` for rejected keys.

Check each package's `vitest.config.ts` for the test environment before writing
a component test.

## Do not

- Do not create a module-state or preference table, or any migration.
- Do not add a feature flag, or gate a module on one.
- Do not write snake_case module keys, and never derive one identifier from
  another by replacing `_` with `-`.
- Do not add explanatory `<p>` copy under a settings heading.
- Do not touch the paths listed under **Concurrency** above.
- Do not add `eslint-disable`, `@ts-ignore`, or `as any`.

## Report

`plans/2026-09-06-finance-apps-foundation/reports/gpt-web/2026-09-06-finance-module-catalogs.md`,
committed with the work. Per-phase status table with the **counted** `it()`
total per phase, every file changed with a reason, decisions the brief did not
settle, everything you could not verify, gaps you left, and the verification
commands below.

## Verification (the orchestrator runs these — you cannot)

```
pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
node scripts/check-app-structure.mjs
```
