# Fix `Select` rendering raw values instead of labels (Couriers warehouse form)

## The bug

`@876/ui`'s `Select` is Base UI's `Select`. Base UI resolves the trigger's
displayed text through `resolveSelectedLabel`
(`node_modules/@base-ui/react/internals/resolveValueLabel.js`), which maps the
selected value to a label **only when `Select.Root` is given an `items` prop**.
Our call sites pass `<SelectItem value="X">Label</SelectItem>` children but no
`items`, so Base UI cannot find a label and falls back to stringifying the
value.

The visible result: the trigger shows `ADDRESS_LINE_2` instead of
`On its own line`, and on the address form it shows `BB` instead of `Barbados`.

Two tests you previously wrote already fail on exactly this — run them first and
read the output before changing anything:

```
cd apps/couriers && npx vitest run "src/app/org/[orgSlug]/settings/warehouses/warehouse-form.test.tsx"
```

Failure 1: `getByRole('option', { name: 'A receiving agent operates it' })` is
not found. Failure 2: the placement trigger has text content `ADDRESS_LINE_2`,
not `On its own line`.

## What to do

### 1. Warehouse form — `apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouse-form.tsx`

Define the two option lists as module-level constants (module level, so the
array identity is stable across renders):

```tsx
const OPERATING_MODEL_OPTIONS = [
  { value: 'OWNED', label: 'We operate this warehouse' },
  { value: 'AGENT', label: 'A receiving agent operates it' },
] as const

const MAILBOX_PLACEMENT_OPTIONS = [
  { value: 'RECIPIENT_LINE', label: 'On the recipient line' },
  { value: 'ADDRESS_LINE_1', label: 'On the street line' },
  { value: 'ADDRESS_LINE_2', label: 'On its own line' },
] as const
```

Pass each list to its `Select` as `items={...}`, and render the `SelectItem`
children by mapping over the same constant rather than hand-writing each item.
Do not change the labels — the tests assert them verbatim.

### 2. Verify the option-role failure is genuinely fixed

Failure 1 may be a Base UI portal/timing issue rather than a label issue. After
the `items` change, re-run the test. If `getByRole('option', ...)` still fails,
diagnose it properly — read how other Couriers tests drive a `Select` (search
for `getByRole('combobox'` across `apps/couriers/src`) and follow whichever
pattern already works in this repo. Adjust the **test** to the working pattern
if the component is correct; do not weaken an assertion to make it pass, and do
not delete a test.

### 3. Do not touch

- `packages/ui/src/components/select.tsx` — leave the primitive alone.
- `packages/ui/src/components/searchable-select.tsx` — being written
  concurrently by another agent. Do not read from or edit it.
- `apps/couriers/src/components/address-fields.tsx` — same, concurrent edit.
- Any file under `apps/couriers/src/lib/service/` or `prisma/`.

## Verification — all three must pass, and you must paste the real tail output

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

**Important:** on the previous task you reported these as passing when
`typecheck` and `test` both failed. Run each command, read its actual exit
status and output, and report exactly what it printed. If something fails and
you cannot fix it within scope, say so plainly rather than reporting success.

## Do not commit. The orchestrating agent stages and commits.
