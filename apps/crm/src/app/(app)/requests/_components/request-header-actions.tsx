'use client'

import { cn } from '@876/core/utils'
import { AppError } from '@876/ui/app-error'
import { buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  ArrowDownFromLine,
  Bell,
  CheckIcon,
  ChevronDownIcon,
  ClipboardList,
  Copy,
  Duplicate,
  Merge,
  MoreHorizontalIcon,
  Pencil,
  Plus,
  Printer,
  Share2,
  StickyNote,
  Trash,
  User,
  UserPlus,
  Users,
  XIcon,
} from '@876/ui/icons'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { RequestPriority, RequestStatus } from '@/types/crm'

import { DeleteRequestDialog } from './delete-request-dialog'
import { NEW_NOTE_FIELD_ID } from './request-notes'
import { NEW_REMINDER_FIELD_ID } from './request-reminders'
import { NEW_TASK_FIELD_ID } from './request-tasks'
import { QuickPrioritySelector } from './quick-priority-selector'
import { QuickStatusSelector } from './quick-status-selector'

export type HeaderTeam = {
  id: string
  name: string
}

export type HeaderMember = {
  userId: string
  name: string
  email?: string | null
  avatar?: string | null
}

type ErrorValue = { code: string; message: string }

function notYet(label: string) {
  toast(`${label} isn’t available yet.`)
}

export function RequestHeaderActions({
  requestId,
  requestNumber,
  status,
  customerId,
  currentUserId,
  assigneeId = null,
  teamId = null,
  priorityId,
  priorities = [],
  teams = [],
  members = [],
}: {
  requestId: string
  requestNumber: number
  status: RequestStatus
  customerId: string
  currentUserId?: string
  assigneeId?: string | null
  teamId?: string | null
  priorityId: string
  priorities?: RequestPriority[]
  teams?: HeaderTeam[]
  members?: HeaderMember[]
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<ErrorValue | null>(null)

  function copyId() {
    navigator.clipboard.writeText(requestId)
    toast.success('Request ID copied to clipboard')
  }

  async function assignToUser(userId: string | null, userName?: string) {
    setError(null)
    const result = await client.requests.update(requestId, {
      assigneeId: userId,
    })
    if (result.error) {
      setError(result.error)
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
    setError(null)
    const result = await client.requests.update(requestId, { teamId })
    if (result.error) {
      setError(result.error)
      return
    }
    toast.success(
      teamId ? `Assigned to ${teamName ?? 'team'}` : 'Removed from team'
    )
    router.refresh()
  }

  /** The trigger names the current assignment, so the control reads as state. */
  const assignedMember = members.find((member) => member.userId === assigneeId)
  const assignedTeam = teams.find((team) => team.id === teamId)
  const assignmentLabel =
    (assigneeId === currentUserId && assigneeId ? 'You' : undefined) ??
    assignedMember?.name ??
    assignedTeam?.name ??
    'Assign'

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
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <QuickStatusSelector requestId={requestId} currentStatus={status} />

        <QuickPrioritySelector
          requestId={requestId}
          currentPriorityId={priorityId}
          priorities={priorities}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 max-w-44 gap-1.5'
            )}
          >
            <UserPlus className="size-3.5 shrink-0" />
            <span className="truncate">{assignmentLabel}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {members.length > 0 ? (
              <>
                <DropdownMenuLabel>Members</DropdownMenuLabel>
                {currentUserId && assigneeId !== currentUserId ? (
                  <DropdownMenuItem onClick={() => assignToUser(currentUserId)}>
                    <User className="size-4" />
                    Assign to me
                  </DropdownMenuItem>
                ) : null}
                {members.map((member) => (
                  <DropdownMenuItem
                    key={member.userId}
                    onClick={() => assignToUser(member.userId, member.name)}
                    className="gap-2.5 py-1.5"
                  >
                    <CustomerAvatar
                      name={member.name}
                      src={member.avatar}
                      className="size-6 shrink-0"
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate leading-tight">
                        {member.userId === currentUserId
                          ? `${member.name} (you)`
                          : member.name}
                      </span>
                      {member.email ? (
                        <span className="text-muted-foreground truncate text-xs leading-tight">
                          {member.email}
                        </span>
                      ) : null}
                    </span>
                    {member.userId === assigneeId ? (
                      <CheckIcon className="text-info ml-auto size-4 shrink-0" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {teams.length > 0 ? (
              <>
                {members.length > 0 ? <DropdownMenuSeparator /> : null}
                <DropdownMenuLabel>Teams</DropdownMenuLabel>
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.id}
                    onClick={() => assignToTeam(team.id, team.name)}
                    className="gap-2.5 py-1.5"
                  >
                    <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
                      <Users className="size-3.5" />
                    </span>
                    <span className="truncate">{team.name}</span>
                    {team.id === teamId ? (
                      <CheckIcon className="text-info ml-auto size-4" />
                    ) : null}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            {assigneeId || teamId ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (assigneeId) assignToUser(null)
                    if (teamId) assignToTeam(null)
                  }}
                >
                  <XIcon className="size-4" />
                  Clear assignment
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5'
            )}
          >
            <Plus className="size-3.5" />
            Add
            <ChevronDownIcon className="size-3.5 opacity-60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              className="gap-2.5 py-1.5"
              onClick={() =>
                compose(NEW_NOTE_FIELD_ID, `/requests/${requestId}`)
              }
            >
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
                <StickyNote className="size-3.5" />
              </span>
              Note
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 py-1.5"
              onClick={() =>
                compose(NEW_TASK_FIELD_ID, `/requests/${requestId}/tasks`)
              }
            >
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
                <ClipboardList className="size-3.5" />
              </span>
              Task
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2.5 py-1.5"
              onClick={() =>
                compose(
                  NEW_REMINDER_FIELD_ID,
                  `/requests/${requestId}/reminders`
                )
              }
            >
              <span className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md">
                <Bell className="size-3.5" />
              </span>
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
            <DropdownMenuItem
              render={<Link href={`/customers/${customerId}`} />}
            >
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
      {error ? (
        <AppError
          title="Request assignment could not be updated"
          error={error}
          variant="inline"
        />
      ) : null}
    </div>
  )
}
