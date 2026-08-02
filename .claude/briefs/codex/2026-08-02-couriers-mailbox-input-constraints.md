# Couriers — constrain the mailbox prefix to letters and the mailbox number to digits

## What is being asked

Two input constraints, each enforced **both** client-side (the form rejects or
prevents the input) and server-side (the schema rejects it, so an API or import
path cannot bypass the form):

1. **`Warehouse.mailboxPrefix` — letters only**, and always stored uppercase.
2. **A mailbox number — digits only.**

## Read these first, in this order

- `apps/couriers/src/types/warehouse.ts` — `optionalMailboxPrefix` already
  exists and already uppercases. It does **not** yet restrict the character set.
- `apps/couriers/src/lib/shipping-address.ts` — `composeShippingAddress` builds
  the token as `[code, prefix, mailboxNumber]` joined by single spaces.
- `apps/couriers/src/lib/service/mailboxes/allocate.ts`
- `apps/couriers/prisma/schema/mailbox.prisma`
- `apps/couriers/src/types/mailbox.ts`

## The complication you must resolve before writing code

There are **two different prefixes** in this codebase and they are easy to
confuse:

- `Warehouse.mailboxPrefix` — a per-warehouse label rendered into the customer's
  shipping address at compose time. This is the one to restrict to letters.
- `Tenant.mailboxPrefix` — a per-tenant prefix that `allocate.ts:22-29`
  concatenates **into the stored `Mailbox.number`** itself
  (`const number = \`${prefix}${candidate}\``), and `mailbox.prisma:3` documents
  the stored number as "alphanumeric".

So "a mailbox number can only be numbers" **conflicts with how numbers are
allocated today**. Do not silently break allocation. Determine and state which
of these is true, then implement accordingly:

- If `Mailbox.number` must become digits-only, `allocate.ts` must stop
  concatenating the tenant prefix into it, and you must say plainly in your
  report that existing rows may contain non-digit numbers and that this is a
  data-migration question you did **not** resolve. **Do not write a migration.**
- If the digits-only rule is meant to apply only to the _number a user types or
  is assigned_ (the `mailboxNumber` input to `composeShippingAddress` and any
  customer-facing mailbox field), constrain those inputs and leave `allocate.ts`
  alone.

Pick the reading that does not break existing allocation, implement it, and
state which you chose and why. If both readings are defensible, implement the
narrower one and say so.

## Requirements

- **Prefix**: `/^[A-Za-z]+$/` when present, stored uppercase, still optional,
  still max 16. Blank remains absence, not an empty string — keep the existing
  `transform(value => value === '' ? undefined : ...)` behaviour.
- **Mailbox number**: `/^[0-9]+$/` wherever it is accepted as input.
- Client-side, the warehouse form's prefix input must **not accept** a
  non-letter keystroke (strip it in `onChange`, exactly as `code` already
  uppercases in `onChange`), and the field already uppercases — keep that.
- Server-side rejection must produce the app's normal validation error, not a 500. Follow the surrounding `ServiceResult` / zod patterns already in the file.
- Error messages match the existing voice, e.g. the sibling
  `'Warehouse code may only contain letters, numbers and hyphens.'`

## Scope — files you may touch

- `apps/couriers/src/types/warehouse.ts`
- `apps/couriers/src/types/mailbox.ts`
- `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouse-form.tsx`
  (the prefix input's `onChange` only — **do not** restructure this form, it was
  just rebuilt)
- `apps/couriers/src/lib/service/mailboxes/**` only if your chosen reading
  requires it
- the matching `*.test.ts(x)` files for whatever you change

**Do not touch:** `packages/**`, `prisma/**` (no schema edits, no migrations),
`apps/couriers/src/lib/shipping-address.ts`, the settings pages, or any other
app.

## Tests

Add cases to the existing test files beside whatever you change:

- prefix accepts letters, uppercases lowercase input, rejects digits, rejects
  punctuation, still treats `''` as absence
- mailbox number accepts digits, rejects letters, rejects punctuation
- if you change `allocate.ts`, its existing tests must still pass and you must
  add one asserting the new number shape

Follow `.claude/rules/testing.md`: assert the specific rejection, not merely
that something threw.

## Verification — run each, read the real output, report it verbatim

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

Report the actual exit status and the actual tail of each. You have previously
reported checks as passing when they failed. If a check fails for a reason
outside this brief, say so plainly instead of claiming success.

## Do not commit. The orchestrating agent stages and commits.
