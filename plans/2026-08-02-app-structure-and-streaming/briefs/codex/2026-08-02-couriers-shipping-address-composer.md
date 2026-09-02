# Couriers — customer shipping address composer (phase 2 of 3)

## Goal

A courier customer needs to be told exactly what to type into a US retailer's
shipping form. That string is the **warehouse address with the customer's
mailbox number interpolated** — and where the mailbox token goes varies by
receiving operation, which phase 1 modelled on the `Warehouse` record as
`code`, `mailboxPrefix` and `mailboxPlacement`.

Phase 1 (already merged into this branch) added those columns. This phase turns
them into the actual address a customer sees. Nothing here touches `Package`;
that is phase 3.

## 1. The composer — new file `apps/couriers/src/lib/shipping-address.ts`

A **pure** function. No React, no Prisma, no network, no `Date`. It must be
trivially unit-testable.

```ts
export type ShippingAddressInput = {
  warehouse: WarehouseView
  /** The customer's mailbox number, e.g. "1042". */
  mailboxNumber: string
  /** The customer's full name as it should appear on the parcel. */
  customerName: string
}

/** The address lines a customer types into a retailer's checkout, in order. */
export type ShippingAddressLines = {
  recipient: string
  line1: string
  line2: string | null
  city: string
  region: string | null
  postalCode: string | null
  country: string
}

export function composeShippingAddress(
  input: ShippingAddressInput
): ShippingAddressLines
```

### The mailbox token

Build it once: `${warehouse.code ?? ''}${warehouse.mailboxPrefix ?? ''}${mailboxNumber}`.

Both parts are optional, so with neither set the token is just the mailbox
number. Do **not** insert spaces or separators of your own between `code`,
`mailboxPrefix` and the number — an operation that wants `JMC-1042` stores
`code: "JMC"` and `mailboxPrefix: "-"`, and one that wants `Suite 1042` stores
`mailboxPrefix: "Suite "`. Inventing separators would corrupt both.

### Placement

- `RECIPIENT_LINE` → `recipient` is `` `${customerName} ${token}` ``; `line1`
  and `line2` are the warehouse address unchanged.
- `ADDRESS_LINE_1` → `recipient` is `customerName`; `line1` is
  `` `${address.line1}, ${token}` ``; `line2` is the address's own `line2`.
- `ADDRESS_LINE_2` → `recipient` is `customerName`; `line1` is the address's
  `line1`. `line2` is the token. **If the warehouse address already has a
  `line2`, the result is `` `${address.line2}, ${token}` `` ** — dropping a
  suite/unit line would send the parcel to the wrong bay in a shared building.

`region` uses `address.regionName` (the display snapshot), falling back to
`address.regionCode`, else null. `country` is `address.countryCode`.

Trim the final strings; never emit a line that is only whitespace or a dangling
separator.

## 2. Tests — `apps/couriers/src/lib/shipping-address.test.ts`

Follow `.claude/rules/testing.md` strictly. This function is pure, so aim for
full branch coverage. Required cases, each its own `it`:

- Each of the three placements produces the documented shape (assert the whole
  returned object with `toEqual`, not one field).
- `ADDRESS_LINE_2` with an existing `address.line2` appends rather than
  replaces — assert the exact combined string.
- `code` set, `mailboxPrefix` unset.
- `mailboxPrefix` set, `code` unset.
- Both unset → token is the bare mailbox number.
- Both set → concatenated with no inserted separator.
- `regionName` null but `regionCode` set → falls back to the code.
- Both region fields null → `region` is null.
- `postalCode` null → `postalCode` is null.
- Whitespace in `customerName` / `mailboxNumber` is trimmed in the output.

Build the `WarehouseView` fixture with a local factory taking
`Partial<WarehouseView>` overrides and realistic defaults (a Miami address),
per the fixture rules in the testing guide. Do not create a shared fixture file.

## 3. Surface it — warehouse detail page

Find the warehouse detail/edit page under
`apps/couriers/src/app/org/[orgSlug]/settings/warehouses/[id]/`. Add a read-only
**"Customer address"** preview card showing the composed lines for a sample
mailbox number `1042` and the sample name `Customer Name`, so an admin can see
the effect of the placement setting while editing it.

- Render it in the same `876-card p-5` shell the other cards use.
- Render the lines as a `<address>` block, one line per row, `not-italic`.
- Label it plainly. Per the repo UI-copy rule, no explanatory paragraph under
  the heading; a single short muted line noting it is a sample is acceptable.
- Do not add a green style to anything.

## Scope — files you may touch

- `apps/couriers/src/lib/shipping-address.ts` (new)
- `apps/couriers/src/lib/shipping-address.test.ts` (new)
- the warehouse detail page under `.../settings/warehouses/[id]/`

**Do not touch:** `packages/ui/**`, `apps/couriers/src/components/address-fields.tsx`,
`apps/couriers/src/test/setup.ts`, `prisma/**`, `src/lib/service/**`,
`src/types/warehouse.ts`, or the `Package`/`Manifest` models.

## Verification — run each, read the real output, report it verbatim

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

You have twice reported checks as passing when they failed. Report the actual
exit status and the actual tail of each command. If a check fails and the fix is
outside this brief's scope, say so explicitly instead of claiming success.

## Do not commit. The orchestrating agent stages and commits.
