# Codex brief — Phase 4c: finish the recurring-invoices and reporting UI

Run: `plans/2026-09-11-commercial-engine-account-ledger/` · Branch
`feat/commercial-engine-account-ledger` (checked out; do not create/switch/push
branches). **Do not commit.** No AI attribution. You are the only agent in the
tree.

## Situation

Two delegated UI runs were interrupted before finishing and wrote no reports:

- **4a** — `briefs/opencode/2026-09-11-phase-4a-recurring-invoices-ui.md`
- **4b** — `briefs/opencode/2026-09-11-phase-4b-reporting-ui.md`

Their partial output is uncommitted in the tree (see `git status`). **Keep it
and finish it** — do not start over and do not delete their files unless a file
is genuinely wrong. Everything the UI needs from the backend/SDK is already
committed (recurring invoices, reports, report preferences, item sales summary,
customer account `lifetimeSales`/`lifetimeCredits`/`lastSaleAt`/
`activeSubscriptionCount`/`subscriptionMrr`). Read
`reports/opencode/2026-09-11-phase-3-reporting.md` and
`reports/codex/2026-09-11-phase-2-recurring-invoices.md` for the real SDK names.

Read both briefs fully — **their scope, rules, test floors and "must not" lists
are binding for you** — plus `CLAUDE.md` and the rule files they name.

## Known state (verified by the orchestrator at hand-off)

- `@876/billing-ui` typecheck: clean.
- `@876/billing-app` typecheck: 22 errors; `@876/invoice-app`: 14. Almost all
  are `Cannot find module '@876/billing-ui/panels/…'` /
  `'@876/billing-ui/report-range'`: the 4b run was told not to edit
  `packages/billing-ui/package.json`, so its new subpaths are **not exported**.
  Add every new subpath export (`panels/*-panel`, `panels/report-bars`,
  `report-range`, and any 4a `recurring-invoice*` entries still missing),
  following the file's existing convention. Then fix what remains (e.g.
  `apps/invoice/src/app/(app)/reports/_components/report-panels.tsx:219`
  implicit `any`).
- Apparently **not done yet** (check, then complete):
  - Invoice customer overview `CustomerSalesSummaryPanel`
    (`apps/invoice/src/app/(app)/customers/[customerId]/page.tsx`) — Billing
    has it;
  - Invoice item overview `ItemSalesSummaryPanel`
    (`apps/invoice/src/app/(app)/items/[itemId]/page.tsx`) — Billing has it;
  - Invoice report-settings page + route handler mirroring Billing's
    `features/settings/components/report-preferences-form.tsx` and
    `app/api/report-preferences/` (Invoice already has
    `apps/invoice/src/app/api/report-preferences/` — verify it is wired and
    has a UI entry point);
  - anything else either brief requires that you find missing (compare each
    brief's scope list against the tree and list the result in your report).
- Parity: Billing and Invoice must expose the same recurring-invoice routes and
  the same reporting panels, except the subscription summary panel and
  subscription figures, which are Billing-only (Invoice has no subscriptions
  module).
- The report-preference PATCH on the API requires `sales:write`; make sure each
  host's route handler/guard and UI reflect that (hide or disable the save for
  members without it, and handle a 403 inline — no error toasts).

## Quality bar

- Review the partial files you inherit as critically as new code: no
  `eslint-disable` / `as any` / `@ts-ignore`, no green buttons or bars, no prose
  paragraphs under headings, chrome never skeletoned, one `<Suspense>` per
  independent data region, errors render inline without taking over the page.
- Money stays minor-unit strings; never add currencies together.
- Tests must actually execute in each package's vitest environment (check
  `vitest.config.ts`). Meet both briefs' test floors across the combined work
  and count them.

## Verification (foreground; all must pass)

```bash
pnpm --filter @876/billing-ui typecheck && pnpm --filter @876/billing-ui test
pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
pnpm --filter @876/billing-app typecheck && pnpm --filter @876/billing-app test
pnpm --filter @876/invoice-app typecheck && pnpm --filter @876/invoice-app test
timeout 900 pnpm --filter @876/billing-app lint
timeout 900 pnpm --filter @876/invoice-app lint
pnpm check:transpile
node scripts/check-app-structure.mjs   # one pre-existing ConsoleHome violation on main is expected
grep -rn "eslint-disable\|as any\|@ts-ignore" packages/billing-ui/src apps/billing/src apps/invoice/src
```

## Report

`reports/codex/2026-09-11-phase-4c-finish-ui.md`: what you inherited vs what
you added, files + why, a checklist of every scope item from both briefs with
done/not done, counted `it()` per group, verification output, and gaps. No run
logs.
