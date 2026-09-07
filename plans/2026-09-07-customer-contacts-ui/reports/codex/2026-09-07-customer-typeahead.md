# Customer typeahead report

## Files changed

- `apps/billing/src/app/(app)/(sales)/invoices/new/page.tsx`
- `apps/billing/src/app/(app)/(sales)/quotes/new/page.tsx`
- `apps/billing/src/features/documents/components/document-create-form.tsx`
- `apps/billing/src/features/documents/components/document-create-form.test.tsx`
- `apps/billing/src/lib/client/customers.ts`
- `apps/billing/src/lib/customers/document-recipient.ts`
- `apps/invoice/src/app/(app)/invoices/new/page.tsx`
- `apps/invoice/src/app/(app)/quotes/new/page.tsx`
- `apps/invoice/src/features/documents/components/document-create-form.tsx`
- `apps/invoice/src/features/documents/components/document-create-form.test.tsx`
- `apps/invoice/src/lib/client/customers.ts`

## Tests

There are 23 counted `it()` cases across the two document-feature test trees.

## Verification

Passed:

```text
pnpm --filter @876/billing-app typecheck
$ tsc --noEmit

pnpm --filter @876/invoice-app typecheck
$ tsc --noEmit
```

The requested full Vitest commands could not be conclusively verified in this
shared worktree: each focused command remained running beyond the command
runner's 30-second foreground window and left Vitest workers running. This
appears to be a pre-existing shared-runner/process contention issue; the
component typechecks above completed successfully.

Passed:

```text
node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

`git pull` was attempted before and after work. It could not proceed because
the local `feature/customer-contacts-ui` branch has no upstream; an explicit
`git pull origin feature/customer-contacts-ui` also failed because `origin`
does not advertise that ref.

Invoice needs the same recipient-details presentation as Billing. A true shared
component belongs in `@876/billing-ui`, but that package was explicitly out of
scope for this pass; Invoice therefore renders the equivalent basic recipient
details inline rather than introducing a second named recipient-details module.
