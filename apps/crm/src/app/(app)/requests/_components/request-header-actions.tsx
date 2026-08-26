'use client'

import { buttonVariants } from '@876/ui/button'
import { cn } from '@876/core/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  ArrowDownFromLine,
  Bell,
  ChevronDownIcon,
  ClipboardList,
  Copy,
  Duplicate,
  Merge,
  MoreHorizontalIcon,
  Pencil,
  Printer,
  Share2,
  StickyNote,
  Trash,
  User,
  UserPlus,
  Users,
} from '@876/ui/icons'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import type { RequestStatus } from '@/types/crm'

import { DeleteRequestDialog } from './delete-request-dialog'
import { NEW_NOTE_FIELD_ID } from './request-notes'
import { QuickStatusSelector } from './quick-status-selector'

/**
 * Announces an action that is designed but not built yet.
 *
 * A control that silently does nothing is worse than no control: the user
 * cannot tell a missing feature from a broken one. Saying so costs a toast and
 * keeps the toolbar honest while the surface fills in.
 */
function notYet(label: string) {
  toast(`${label} isn’t available yet.`)
}

export function RequestHeaderActions({
  requestId,
  requestNumber,
  status,
  customerId,
}: {
  requestId: string
  requestNumber: number
  status: RequestStatus
  customerId: string
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  function copyId() {
    navigator.clipboard.writeText(requestId)
    toast.success('Request ID copied to clipboard')
  }

  /** "Add note" already has a home — the composer at the end of the thread. */
  function focusComposer() {
    const field = document.getElementById(NEW_NOTE_FIELD_ID)
    if (!field) return notYet('Adding a note')

    field.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuickStatusSelector requestId={requestId} currentStatus={status} />

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-8 gap-1.5'
          )}
        >
          <UserPlus className="size-3.5" />
          Assign
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem onClick={() => notYet('Assigning a request')}>
            <User className="size-4" />
            Assign to me
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Assigning to a team')}>
            <Users className="size-4" />
            Assign to team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-8 gap-1.5'
          )}
        >
          Add
          <ChevronDownIcon className="size-3.5 text-sky-600 dark:text-sky-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem onClick={focusComposer}>
            <StickyNote className="size-4" />
            Note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Tasks')}>
            <ClipboardList className="size-4" />
            Task
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Reminders')}>
            <Bell className="size-4" />
            Reminder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        href={`/requests/${requestId}/edit`}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 gap-1.5'
        )}
      >
        <Pencil className="size-3.5" />
        Edit
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'size-8'
          )}
          aria-label="More actions"
        >
          <MoreHorizontalIcon className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-44">
          <DropdownMenuItem onClick={() => notYet('Sharing a request')}>
            <Share2 className="size-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Duplicating a request')}>
            <Duplicate className="size-4" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Merging requests')}>
            <Merge className="size-4" />
            Merge
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => notYet('Printing a request')}>
            <Printer className="size-4" />
            Print
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={copyId}>
            <Copy className="size-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/customers/${customerId}`} />}>
            <User className="size-4" />
            View customer
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => notYet('Exporting a request')}>
            <ArrowDownFromLine className="size-4" />
            Export
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteRequestDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        requestId={requestId}
        requestNumber={requestNumber}
      />
    </div>
  )
}
