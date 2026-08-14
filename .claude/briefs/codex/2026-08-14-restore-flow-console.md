# Codex brief — Restore/un-delete flow (Console UI: @876/console)

## Context & why

The core API (@876/api) and @876/admin are gaining a **restore** endpoint for
soft-deleted orgs and users:
- `POST /organizations/:id/restore` → returns the live organization
- `POST /users/:id/restore` → returns the live user
- admin client: `$876.organizations.admin.restore(orgId)` and
  `$876.users.admin.restore(userId)` (added in a parallel change — assume they exist).

Wire the Console UI so an admin viewing a soft-deleted org/user can restore it. Console
already shows deleted records (via `include_deleted`) and each detail page's actions menu
already has an `isDeleted` branch that currently offers only "Purge". Add a "Restore"
action to that branch.

Follow `.agents/rules/git.md` (no AI attribution) and `.claude/rules/app-layout.md`
(bare verb labels, dialogs only for confirmations — which this is). DO NOT COMMIT.

File scope (only these — do NOT touch @876/api or packages/admin):
- apps/console/src/lib/client/orgs.ts
- apps/console/src/lib/client/users.ts
- apps/console/src/app/api/organizations/[id]/restore/route.ts   (NEW)
- apps/console/src/app/api/users/[id]/restore/route.ts           (NEW)
- apps/console/src/app/(app)/orgs/[slug]/_components/restore-org-dialog.tsx    (NEW)
- apps/console/src/app/(app)/orgs/[slug]/_components/org-actions.tsx
- apps/console/src/app/(app)/users/[username]/_components/restore-user-dialog.tsx (NEW)
- apps/console/src/app/(app)/users/[username]/_components/user-actions.tsx

---

## Part 1 — browser client methods

1a. apps/console/src/lib/client/orgs.ts — add a `restore` next to `purge`. It returns
the full organization (POST). Mirror the existing `update` return type:

```ts
export const restore = (orgId: string) =>
  request<AdminOrganization>(
    `/api/organizations/${encodeURIComponent(orgId)}/restore`,
    { method: 'POST' }
  )
```

Add `restore` to the exported `organizations` object (next to `del`/`purge`).

1b. apps/console/src/lib/client/users.ts — add `restore` next to `purge`, returning the
full user. Look at how `update`/`retrieve` type their return (e.g. `AdminUser`) and reuse:

```ts
export const restore = (userId: string) =>
  request<AdminUser>(`/api/users/${encodeURIComponent(userId)}/restore`, {
    method: 'POST',
  })
```

Add `restore` to the exported `users` object.

---

## Part 2 — pure-transport route handlers (POST)

Mirror the existing purge route handlers EXACTLY (same imports, `runtime = 'nodejs'`,
`requireConsolePermission`, `apiJson` envelope). Restore is the inverse of Delete, so gate
it on the SAME permission Delete uses — `console:organizations` / `console:users` — NOT
`console:danger_zone`.

2a. NEW apps/console/src/app/api/organizations/[id]/restore/route.ts:

```ts
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/**
 * Restores a soft-deleted organization: clears the tombstone, re-opens the
 * memberships the delete closed, and re-registers the Billing customer as active.
 */
export async function POST(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await context.params

  const { data, error } = await $876.organizations.admin.restore(id)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to restore organization.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
```

2b. NEW apps/console/src/app/api/users/[id]/restore/route.ts — same shape, `console:users`,
`$876.users.admin.restore(id)`, message "Failed to restore user."

---

## Part 3 — restore dialogs (NON-destructive confirmations)

Mirror delete-user-dialog.tsx / delete-org-dialog.tsx but non-destructive: NOT
`variant="destructive"`, and on success `router.refresh()` (stay on the detail page,
which now shows the restored record) — do NOT `router.push` away.

Pick an existing restore-ish icon from `@876/ui/icons` — check which of `RotateCcw`,
`Undo2`, `ArchiveRestore` is exported and use it (fall back to `RotateCcw`). Verify the
import resolves.

3a. NEW restore-user-dialog.tsx:

```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, RotateCcw } from '@876/ui/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'

import { client } from '@/lib/client'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  displayName: string
}

export function RestoreUserDialog({
  open,
  onOpenChange,
  userId,
  displayName,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      await client.users.restore(userId)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <RotateCcw className="size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle>Restore user?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="text-foreground font-medium">
              {displayName}
            </strong>{' '}
            will be taken out of trash and become visible to users again. They
            will need to sign in again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleConfirm}>
            {isPending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Restore user
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

(If `AlertDialogMedia` requires a bg class, look at how a non-destructive AlertDialog in
this app styles it and match; otherwise plain is fine.)

3b. NEW restore-org-dialog.tsx — same, but `client.organizations.restore(orgId)`, prop
`orgId`, title "Restore organization?", body: "… will be taken out of trash and become
available again, with its members and Billing customer restored."

---

## Part 4 — wire into the actions menus

4a. user-actions.tsx — in the `isDeleted` branch of `destructiveItems`, add a "Restore"
item BEFORE the "Purge" item. Restore is non-destructive (no `variant="destructive"`).
Add a `restoreOpen` state, import `RotateCcw` + `RestoreUserDialog`, and render the dialog
alongside the existing Delete/Purge dialogs at the bottom.

The deleted branch should read:

```tsx
const destructiveItems = isDeleted ? (
  <>
    <DropdownMenuItem onClick={() => setRestoreOpen(true)}>
      <RotateCcw className="size-4" />
      Restore
    </DropdownMenuItem>
    <DropdownMenuItem variant="destructive" onClick={() => setPurgeOpen(true)}>
      <Trash className="size-4" />
      Purge
    </DropdownMenuItem>
  </>
) : (
  /* unchanged: Delete + Purge */
)
```

And render `<RestoreUserDialog open={restoreOpen} onOpenChange={setRestoreOpen}
userId={user.id} displayName={displayName} />` next to the other dialogs.

4b. org-actions.tsx — identical treatment: `restoreOpen` state, `RotateCcw` +
`RestoreOrgDialog` imports, "Restore" item before "Purge" in the deleted branch, render
the dialog. Use the org's id prop the existing DeleteOrgDialog/PurgeOrgDialog use (mirror
their `orgId`/`org.id` usage exactly).

---

## Verify (run all, must pass)

```
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
```

NOTE: typecheck depends on `$876.organizations.admin.restore` /
`$876.users.admin.restore` existing in @876/admin (added in the parallel API change). If
those are not yet present in your working tree, typecheck will fail ONLY on those two
symbols — report that but complete everything else; the orchestrator lands both changes
together.

Do NOT commit. Report which files you changed/created and any deviations.
