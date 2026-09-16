# Couriers — fix every `Select` that renders a raw value instead of its label

## The defect

`@876/ui`'s `Select` is Base UI's `Select`. Base UI resolves the trigger's
displayed text via `resolveSelectedLabel`
(`node_modules/@base-ui/react/internals/resolveValueLabel.js`), and it can only
find a label when `Select.Root` receives an `items` prop of
`{ value, label }` objects. Given only `<SelectItem value="X">Label</SelectItem>`
children, it falls back to stringifying the value — so the closed trigger shows
`admin` instead of `Admin`, or `ADDRESS_LINE_2` instead of `On its own line`.

The fix pattern is already applied and verified in
`apps/couriers/src/app/org/[orgSlug]/settings/warehouses/warehouse-form.tsx`.
**Read that file first** and copy its shape exactly:

1. Declare the options once as a module-level `as const` array of
   `{ value, label }`. Module level matters — a list rebuilt each render is
   still correct here, but module scope keeps it out of the render path.
2. Pass that array to the `Select` as `items={...}`.
3. Render the `SelectItem` children by mapping over the same array, so the
   label can never drift from `items`.

## Files to fix — these three only

1. `apps/couriers/src/app/org/[orgSlug]/settings/users/invite-dialog.tsx`
2. `apps/couriers/src/app/org/[orgSlug]/settings/users/user-detail.tsx`
3. `apps/couriers/src/app/org/[orgSlug]/settings/orgprofile/field-controls.tsx`

For each `Select` in those files:

- **Preserve the currently rendered label text verbatim.** You are fixing which
  string the trigger shows, not rewriting copy. If an option's label today is
  `Admin`, it stays `Admin`.
- If a select's options are already derived from props or a fetched array rather
  than hardcoded children, do **not** hoist them to module scope — build the
  `{ value, label }` array with `useMemo` in the component and pass that as
  `items`.
- If a select has a placeholder for "nothing selected", keep it working: pass
  `<SelectValue placeholder="…" />` exactly as it is today.

## Explicitly do not

- Do not modify `packages/ui/src/components/select.tsx`.
- Do not touch `packages/ui/src/components/searchable-select.tsx`,
  `apps/couriers/src/components/address-fields.tsx`, `src/test/setup.ts`,
  the warehouse form, `prisma/**`, or anything under `src/lib/service/`.
- Do not touch `apps/console` — that app is out of scope for this change.
- Do not change any option's value string. Values are persisted data.

## Tests

For each of the three files, if a test file already exists beside it, add one
case asserting the closed trigger shows the human label rather than the raw
value — e.g. `expect(screen.getByRole('combobox', { name: 'Role' }))
.toHaveTextContent('Admin')`. If no test file exists, do not create one.

Note: `apps/couriers/src/test/setup.ts` now polyfills the Pointer Capture API,
so opening a Base UI popup works under jsdom. If you need to open a select in a
test, click the trigger and then use `await screen.findByRole('option', …)` —
the options render a tick after the popup opens.

## Verification — run each, read the real output, report it verbatim

```
pnpm --filter @876/couriers typecheck
pnpm --filter @876/couriers test
pnpm --filter @876/couriers lint
```

Report the actual exit status of each. If a check fails for a reason outside
this brief, say so plainly rather than reporting success.

## Do not commit. The orchestrating agent stages and commits.
