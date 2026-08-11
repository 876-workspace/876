'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil } from '@876/ui/icons'

import { client } from '@/lib/client'

export function CustomerActions({
  orgSlug,
  id,
}: {
  orgSlug: string
  id: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="flex gap-2">
        <Link
          href={`/${orgSlug}/customers/${id}/edit`}
          className={buttonVariants({ variant: 'outline' })}
        >
          <Pencil />
          Edit
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={buttonVariants({ variant: 'outline', size: 'icon-sm' })}
            aria-label="More actions"
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            {/* Export belongs here per the detail-toolbar order, but it is not
                implemented yet and a menu item that does nothing when clicked is
                worse than one that is absent. Add it back with its handler. */}
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setOpen(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This archives the courier profile and removes it from this
              workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                startTransition(async () => {
                  const result = await client.customers.delete(orgSlug, id)
                  if (!result.error) {
                    router.push(`/${orgSlug}/customers`)
                    router.refresh()
                  }
                })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
