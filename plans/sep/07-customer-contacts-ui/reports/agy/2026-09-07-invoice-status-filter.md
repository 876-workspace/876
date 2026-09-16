# Invoice Status Filter Completion & De-duplication Report

**Date:** 2026-09-07  
**Branch:** `feature/customer-contacts-ui`  
**Repository:** `/root/projects/876`  

---

## 1. Files Changed & Summary of Changes

### `packages/billing-ui/src/document-status.ts`
- Preserved existing `DocumentStatusVariant` and `documentStatusVariant` function untouched.
- Appended:
  - `DocumentStatusOption` interface (`value`, `label`, `headingLabel`).
  - `INVOICE_STATUS_OPTIONS` constant array with all 9 options in lifecycle order (`all`, `draft`, `open`, `sent`, `partially_paid`, `overdue`, `paid`, `uncollectible`, `void`).
  - `INVOICE_STATUS_VALUES` constant array containing the 8 non-`all` filter values.
  - `resolveInvoiceStatus(value: string | null | undefined): string` helper that resolves valid filter values or defaults to `'all'`.

### `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-section.tsx`
- Deleted the duplicated local `INVOICE_STATUS_OPTIONS` constant.
- Imported `INVOICE_STATUS_OPTIONS` and `resolveInvoiceStatus` from `@876/billing-ui/document-status`.
- Replaced inline status array membership check with `const selectedStatus = resolveInvoiceStatus(status)`.

### `apps/billing/src/app/(app)/(sales)/invoices/_components/invoices-list.tsx`
- Imported `resolveInvoiceStatus` from `@876/billing-ui/document-status`.
- Replaced inline status array check with `const selectedStatus = resolveInvoiceStatus(status)`.
- Left `documentStatusVariant` import and row rendering (including `row.status.toLowerCase() === selectedStatus`) untouched.

### `apps/invoice/src/app/(app)/invoices/_components/invoices-toolbar.tsx`
- Deleted the duplicated local `INVOICE_STATUS_OPTIONS` constant and the unused `StatusFilterOption` type import.
- Imported `INVOICE_STATUS_OPTIONS` from `@876/billing-ui/document-status`.
- Passed `INVOICE_STATUS_OPTIONS` to `StatusFilterHeading` unchanged.

### `packages/billing-ui/src/document-status.test.ts`
- Kept all existing test cases for `documentStatusVariant` untouched.
- Added a new `describe('invoice status filter options and resolver')` block containing **9** new `it()` cases (all asserting concrete values, no `toBeDefined()`).

---

## 2. Test Cases Added

Total new `it()` test cases added: **9**

1. `contains exactly 9 entries in INVOICE_STATUS_OPTIONS`
2. `has values equal in order to all, draft, open, sent, partially_paid, overdue, paid, uncollectible, void`
3. `lowercases every non-all value from a real InvoiceStatus enum member`
4. `excludes all from INVOICE_STATUS_VALUES and has 8 entries`
5. `resolves partially_paid to 'partially_paid'`
6. `resolves uncollectible to 'uncollectible'`
7. `resolves bogus to 'all'`
8. `resolves null and undefined to 'all'`
9. `has non-empty label and headingLabel for every option`

---

## 3. Step 4 Verification & Real Command Outputs

### Command 1: `pnpm --filter @876/billing-ui typecheck`
- **Exit Code:** `0`
- **Output:**
```
$ tsc --noEmit
```

---

### Command 2: `pnpm --filter @876/billing-ui test`
- **Exit Code:** `1`
- **Output:**
```
$ vitest run

 RUN  v4.1.11 /root/projects/876/packages/billing-ui

 ❯ src/panels/panel.test.ts (2 tests | 1 failed) 30ms
     × does not import service clients, session helpers, or fetch in panel sources 18ms
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document
Not implemented: navigation to another Document

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/panels/panel.test.ts > panel contract > does not import service clients, session helpers, or fetch in panel sources
AssertionError: expected '\'use client\'\n\nimport Link from \'…' not to match /…/(billing|workspace|platform)|server-only|\bfetch\s*\(

- Expected:
/from ['\"]@876\/(billing|workspace|platform)|server-only|\bfetch\s*\(/

+ Received:
"'use client'

import Link from 'next/link'
import type { CustomerContact } from '@876/billing'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { buttonVariants, Button } from '@876/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon } from '@876/ui/icons'

import { PanelError, PanelFrame, PanelRowsSkeleton } from './panel-frame'
import type { PanelProps, PanelState } from './panel'

export interface CustomerContactsPanelProps extends PanelProps {
  state: PanelState<CustomerContact[]>
  addHref: string
  editHref: (contactId: string) => string
  onDelete?: (contactId: string) => void | Promise<void>
  canManage: boolean
  deletingContactId?: string | null
}

export function CustomerContactsPanel({
  state,
  addHref,
  editHref,
  onDelete,
  canManage,
  deletingContactId,
  ...props
}: CustomerContactsPanelProps) {
  return (
    <PanelFrame
      title=\"Contacts\"
      action={
        canManage ? (
          <Link href={addHref} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            + Add
          </Link>
        ) : null
      }
      {...props}
    >
      {state.status === 'ready' ? (
        <div className=\"divide-y\">
          {state.data.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              editHref={editHref(contact.id)}
              canManage={canManage}
              deleting={deletingContactId === contact.id}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : state.status === 'empty' ? (
        <p className=\"text-muted-foreground py-2 text-sm\">No contacts yet.</p>
      ) : (
        <PanelError error={state} />
      )}
    </PanelFrame>
  )
}

export function CustomerContactsPanelSkeleton() {
  return <PanelFrame title=\"Contacts\"><PanelRowsSkeleton rows={3} /></PanelFrame>
}

function ContactRow({ contact, editHref, canManage, deleting, onDelete }: {
  contact: CustomerContact
  editHref: string
  canManage: boolean
  deleting: boolean
  onDelete?: (contactId: string) => void | Promise<void>
}) {
  const name = contactName(contact)
  const details = [contact.email, contact.workPhone, contact.mobilePhone].filter(Boolean)

  return (
    <div className=\"flex items-center gap-3 py-3 first:pt-0 last:pb-0\">
      <Avatar className=\"size-9 text-xs\">
        {contact.avatar ? <AvatarImage src={contact.avatar} alt=\"\" /> : null}
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className=\"min-w-0 flex-1\">
        <div className=\"flex items-center gap-2\">
          <p className=\"truncate text-sm font-medium\">{name}</p>
          {contact.isPrimary ? <Badge variant=\"secondary\">Primary</Badge> : null}
        </div>
        {details.length ? <p className=\"text-muted-foreground truncate text-xs\">{details.join(' · ')}</p> : null}
      </div>
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant=\"ghost\" size=\"icon-sm\" aria-label={`Actions for ${name}`} />}>
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align=\"end\">
            <DropdownMenuItem render={<Link href={editHref} />}>Edit</DropdownMenuItem>
            {onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger render={<DropdownMenuItem variant=\"destructive\" disabled={deleting} />}>Delete</AlertDialogTrigger>
                <AlertDialogContent size=\"sm\">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this contact?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant=\"destructive\" disabled={deleting} onClick={() => onDelete(contact.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

function contactName(contact: CustomerContact) {
  return [contact.salutation, contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unnamed contact'
}

function initials(name: string) {
  return name.split(/\\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'
}
"

 ❯ src/panels/panel.test.ts:6:280


⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 25 passed (26)
      Tests  1 failed | 294 passed (295)
   Start at  15:17:42
   Duration  36.74s (transform 2.61s, setup 0ms, import 27.98s, tests 31.38s, environment 40.56s)

/root/projects/876/packages/billing-ui:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/billing-ui@0.1.0 test: `vitest run`
Exit status 1
```

*Note on test execution:* All 25 tests in `src/document-status.test.ts` (16 existing + 9 new) pass completely. The single failing test in the package is in `src/panels/panel.test.ts` caused by `src/panels/customer-contacts-panel.tsx` which is owned and currently being modified by a concurrent agent.

Direct test run on `src/document-status.test.ts`:
```
 RUN  v4.1.11 /root/projects/876/packages/billing-ui

 Test Files  1 passed (1)
      Tests  25 passed (25)
   Start at  15:15:25
   Duration  1.90s (transform 103ms, setup 0ms, import 136ms, tests 16ms, environment 1.50s)
```

---

### Command 3: `pnpm --filter @876/billing-app typecheck`
- **Exit Code:** `2`
- **Output:**
```
$ tsc --noEmit
src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-edit-form.tsx:17:8 - error TS2459: Module '"../_lib/invoice-editability"' declares 'InvoiceStatus' locally, but it is not exported.

17   type InvoiceStatus,
          ~~~~~~~~~~~~~

  src/app/(app)/(sales)/invoices/[invoiceId]/_lib/invoice-editability.ts:1:15
    1 import type { InvoiceStatus } from '@/types/invoice'
                    ~~~~~~~~~~~~~
    'InvoiceStatus' is declared here.


Found 1 error in src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-edit-form.tsx:17

/root/projects/876/apps/billing:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/billing-app@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

*Note:* Our modified files (`invoices-section.tsx` and `invoices-list.tsx`) have 0 type errors. The error is in `invoices/[invoiceId]/_components/invoice-edit-form.tsx:17`, owned by another agent.

---

### Command 4: `pnpm --filter @876/invoice-app typecheck`
- **Exit Code:** `2`
- **Output:**
```
$ tsc --noEmit
src/app/(app)/invoices/[invoiceId]/edit/page.tsx:23:52 - error TS2339: Property 'organizationId' does not exist on type '{ userId: string; accountType?: string | null | undefined; }'.

23   const result = await listInvoices(access.subject.organizationId)
                                                      ~~~~~~~~~~~~~~


Found 1 error in src/app/(app)/invoices/[invoiceId]/edit/page.tsx:23

/root/projects/876/apps/invoice:
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @876/invoice-app@0.1.0 typecheck: `tsc --noEmit`
Exit status 2
```

*Note:* Our modified file (`invoices-toolbar.tsx`) has 0 type errors. The error is in `invoices/[invoiceId]/edit/page.tsx:23`, owned by another agent.

---

### Command 5: `npx prettier --check packages/billing-ui/src/document-status.ts`
- **Exit Code:** `0`
- **Output:**
```
Checking formatting...
packages/billing-ui/src/document-status.tsAll matched files use Prettier code style!
```

---

## 4. Anything Could Not Do

Per the concurrency constraints:
1. Did not resolve the `src/panels/panel.test.ts` failure because it requires editing `src/panels/customer-contacts-panel.tsx` / `customer-contact-form.tsx` or `packages/billing-ui/package.json`, which are owned by a concurrent agent.
2. Did not resolve the TypeScript error in `apps/billing/src/app/(app)/(sales)/invoices/[invoiceId]/_components/invoice-edit-form.tsx` because files under `invoices/[invoiceId]/` are owned by another agent.
3. Did not resolve the TypeScript error in `apps/invoice/src/app/(app)/invoices/[invoiceId]/edit/page.tsx` because files under `invoices/[invoiceId]/` are owned by another agent.
4. Did not commit, create a branch, or open a pull request per explicit instructions.
