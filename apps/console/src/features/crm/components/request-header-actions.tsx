'use client'

import { cn } from '@876/core/utils'
import { showAppErrorToast } from '@876/ui/app-error-toast'
import { buttonVariants } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'

import type { RequestStatus } from '../types'
import { DeleteRequestDialog } from './delete-request-dialog'
import { NEW_NOTE_FIELD_ID } from './request-notes'
import { NEW_REMINDER_FIELD_ID } from './request-reminders'
import { NEW_TASK_FIELD_ID } from './request-tasks'
import { QuickStatusSelector } from './quick-status-selector'

export type HeaderDepartment = {
  id: string
  name: string
}

export type HeaderMember = {
  userId: string
  name: string
}

function notYet(label: string) {
  toast(`${label} isn’t available yet.`)
}

export function RequestHeaderActions({
  organizationId,
  requestId,
  requestNumber,
  status,
  customerId,
  currentUserId,
  departments = [],
  members = [],
  baseHref = `/support/${requestId}`,
  customerHref = `/customers/${customerId}`,
}: {
  organizationId: string
  requestId: string
  requestNumber: number
  status: RequestStatus
  customerId: string
  currentUserId?: string
  departments?: HeaderDepartment[]
  members?: HeaderMember[]
  baseHref?: string
  customerHref?: string
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  function copyId() {
    navigator.clipboard.writeText(requestId)
    toast.success('Request ID copied to clipboard')
  }

  async function assignToUser(userId: string | null, userName?: string) {
    const result = await client.requests.update(organizationId, requestId, {
      assigneeId: userId,
    })
    if (result.error) {
      showAppErrorToast(result.error, {
        title: 'Request could not be assigned',
      })
      return
    }
    toast.success(
      userId
        ? userId === currentUserId
          ? 'Assigned to you'
          : `Assigned to ${userName ?? 'member'}`
        : 'Unassigned'
    )
    router.refresh()
  }

  async function assignToTeam(teamId: string | null, teamName?: string) {
    const result = await client.requests.update(organizationId, requestId, {
      teamId,
    })
    if (result.error) {
      showAppErrorToast(result.error, {
        title: 'Team assignment could not be updated',
      })
      return
    }
    toast.success(
      teamId ? `Assigned to ${teamName ?? 'team'}` : 'Removed from team'
    )
    router.refresh()
  }

  function compose(fieldId: string, href: string) {
    const field = document.getElementById(fieldId)
    if (!field) {
      router.push(href)
      return
    }

    field.scrollIntoView({ behavior: 'smooth', block: 'center' })
    field.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <QuickStatusSelector
        organizationId={organizationId}
        requestId={requestId}
        currentStatus={status}
      />

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
          {currentUserId && (
            <DropdownMenuItem onClick={() => assignToUser(currentUserId)}>
              <User className="size-4" />
              Assign to me
            </DropdownMenuItem>
          )}

          {departments.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users className="size-4" />
                Assign to team
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto min-w-44">
                <DropdownMenuItem onClick={() => assignToTeam(null)}>
                  No team
                </DropdownMenuItem>
                {departments.map((dept) => (
                  <DropdownMenuItem
                    key={dept.id}
                    onClick={() => assignToTeam(dept.id, dept.name)}
                  >
                    {dept.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          {members.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <User className="size-4" />
                Assign to member
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto min-w-44">
                <DropdownMenuItem onClick={() => assignToUser(null)}>
                  Unassigned
                </DropdownMenuItem>
                {members.map((member) => (
                  <DropdownMenuItem
                    key={member.userId}
                    onClick={() => assignToUser(member.userId, member.name)}
                  >
                    {member.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => assignToUser(null)}>
            Unassign
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
          <DropdownMenuItem
            onClick={() => compose(NEW_NOTE_FIELD_ID, baseHref)}
          >
            <StickyNote className="size-4" />
            Note
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => compose(NEW_TASK_FIELD_ID, `${baseHref}/tasks`)}
          >
            <ClipboardList className="size-4" />
            Task
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              compose(NEW_REMINDER_FIELD_ID, `${baseHref}/reminders`)
            }
          >
            <Bell className="size-4" />
            Reminder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        onClick={() => notYet('Editing a request')}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 gap-1.5'
        )}
      >
        <Pencil className="size-3.5" />
        Edit
      </button>

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
          <DropdownMenuItem render={<Link href={customerHref} />}>
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
        organizationId={organizationId}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        requestId={requestId}
        requestNumber={requestNumber}
        currentUserId={currentUserId}
      />
    </div>
  )
}
