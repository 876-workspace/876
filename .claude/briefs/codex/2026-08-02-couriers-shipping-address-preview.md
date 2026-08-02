# Couriers — surface the composed customer shipping address (phase 2, part 2)

Continues `.claude/briefs/codex/2026-08-02-couriers-shipping-address-composer.md`.
Parts 1 and 2 of that brief (the pure composer and its unit tests) are **already
written and on disk** — do not rewrite them:

- `apps/couriers/src/lib/shipping-address.ts`
- `apps/couriers/src/lib/shipping-address.test.ts`

Read both first. `composeShippingAddress(input)` takes
`{ warehouse: WarehouseView, mailboxNumber: string, customerName: string }` and
returns `{ recipient, line1, line2, city, region, postalCode, country }`, where
`line2`, `region` and `postalCode` are nullable.

## What is left to do

Add a read-only **"Customer address"** preview to the warehouse edit page,
`apps/couriers/src/app/org/[orgSlug]/settings/warehouses/[id]/edit/page.tsx`.
There is no separate detail page — the edit page is the only `[id]` route, and
it already loads the warehouse via `service.warehouses.retrieve`.

Requirements:

- Compose the preview from the **saved** warehouse record the page already has.
  Do not thread live form state into it, and do not modify `warehouse-form.tsx`.
- Sample inputs: mailbox number `1042`, customer name `Customer Name`.
- Render it in the same `876-card p-5` shell the app's other cards use — check a
  neighbouring settings page for the exact markup rather than inventing one.
- The lines go in an `<address>` block, one line per row, `not-italic`. Omit a
  line when its value is null; never render an empty row or a dangling comma.
  City / region / postal code read naturally on one line.
- Per the repo UI-copy rule there is **no** explanatory paragraph under the
  heading. One short muted line noting the values are a sample is acceptable.
- Nothing green.
- Place it after `<WarehouseForm …>`, inside the same `<Page>`.
- Extract the card into its own component file beside the page if that keeps the
  page readable; a server component is correct here — it needs no interactivity.

## Scope — files you may touch

- `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/[id]/edit/page.tsx`
- one new component file beside it, if you extract the card

**Do not touch:** `apps/couriers/src/lib/shipping-address.ts`, its test file,
`warehouse-form.tsx`, `packages/ui/**`, `prisma/**`, `src/lib/service/**`,
`src/types/**`, or anything under `apps/console`.

## Verification — run each, read the real output, report it verbatim

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

The new `shipping-address.test.ts` must pass as part of that run; if it fails,
report the failure rather than editing the test to match your reading of the
composer.

You have previously reported checks as passing when they failed. Report the
actual exit status and the actual tail of each command. If a check fails for a
reason outside this brief, say so plainly instead of claiming success.

## Do not commit. The orchestrating agent stages and commits.
