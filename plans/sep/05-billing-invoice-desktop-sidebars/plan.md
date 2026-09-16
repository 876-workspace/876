# Implementation Plan: Billing and Invoice desktop sidebars

Run ID: `2026-09-05-billing-invoice-desktop-sidebars`
Branch: `fix/product-desktop-sidebars` (based on `origin/main`)
Status: COMPLETED

Restore the standard edge-attached desktop sidebar in Billing and Invoice.
Preserve the existing mobile drawer, navigation, and icon collapse behavior.

## Scope and decision

Change each app's `BaseSidebar` variant from `floating` to `sidebar`.
The shared `@876/ui/sidebar` component handles mobile before consulting the
desktop variant, so no responsive override or shared component edit is needed.
Console and CRM retain their existing appearance.
Couriers is included with the same desktop variant and icon sizing. Its icon
colors already use inline CSS variables and require no Tailwind source change.

Follow-up: use 16px navigation icons on desktop while retaining 18px on mobile.
Add the shared Billing navigation registry as a Tailwind source in both apps so
its icon color classes are generated after the registry moved out of the apps.
Verified both stylesheets with the installed Tailwind PostCSS compiler: all five
navigation color selectors and the responsive `md:size-4` selector are emitted.
`git diff --check` passed for the follow-up.

## Checklist

- [x] Inspect sidebar and shell rendering in both apps and the shared UI package.
- [x] Change the two desktop variant settings.
- [x] Review the diff for unrelated changes and run `git diff --check`.
- [x] Run `pnpm --filter @876/billing-app --filter @876/invoice-app typecheck` (both passed).

## Delegation

No dispatched briefs or execution reports; this is a two-line configuration change.

## Handoff and PR preparation

Implementation is complete. Billing, Invoice, and Couriers app typechecks passed.
ESLint passed for all changed TSX files; Prettier passed for all changed files.
Couriers sidebar tests passed (4 tests). The full diff was reviewed for correctness
and scope; no shared primitives or mobile branches changed. The `/code-review`
command is not available in this harness, so review was performed directly.
No browser visual check has been performed. Preparing a PR against `main`.
