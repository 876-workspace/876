'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { formatDate, formatDateTime } from '@876/core/timestamps'
import { cn } from '@876/core/utils'
import { Badge } from '@876/ui/badge'
import { Button, buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import {
  ArrowDownFromLine,
  Merge,
  MoreHorizontalIcon,
  Pencil,
  Trash,
  Users,
  XIcon,
} from '@876/ui/icons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'

import { MemberPicker } from '@/features/directory/components/member-picker'
import type { DirectoryMember } from '@/features/directory/types'
import { client } from '@/lib/client'
import type { CrmTeamMemberRole } from '@/types/crm'

import {
  AUTO_ASSIGN_LABELS,
  getTeamColorVariant,
  type TeamRow,
} from './team-row'

const DETAIL_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'members', label: 'Members' },
  { value: 'activity', label: 'Activity' },
] as const

type TabValue = (typeof DETAIL_TABS)[number]['value']

type Props = {
  team: TeamRow
  directory: DirectoryMember[]
  onClose: () => void
  className?: string
}

export function TeamDetail({ team, directory, onClose, className }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('overview')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const colorVariant = getTeamColorVariant(team.color)

  async function toggleStatus() {
    if (changingStatus) return
    setChangingStatus(true)
    const nextStatus = team.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'
    const result = await client.teams.update(team.id, { status: nextStatus })
    setChangingStatus(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success(nextStatus === 'ACTIVE' ? 'Team restored' : 'Team archived')
    router.refresh()
  }

  async function handleDelete() {
    if (deleting) return
    if (!window.confirm(`Delete team "${team.name}"?`)) return
    setDeleting(true)
    const result = await client.teams.delete(team.id)
    setDeleting(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success('Team deleted')
    onClose()
    router.refresh()
  }

  async function handleAddMember() {
    if (!selectedMemberId || addingMember) return
    setAddingMember(true)
    const result = await client.teams.members.add(team.id, {
      userId: selectedMemberId,
      role: 'MEMBER',
    })
    setAddingMember(false)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    setSelectedMemberId(null)
    toast.success('Member added to team')
    router.refresh()
  }

  async function handleUpdateRole(userId: string, role: CrmTeamMemberRole) {
    const result = await client.teams.members.update(team.id, userId, { role })
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success('Member role updated')
    router.refresh()
  }

  async function handleRemoveMember(userId: string) {
    if (!window.confirm('Remove this member from the team?')) return
    const result = await client.teams.members.remove(team.id, userId)
    if (result.error) {
      toast.error(result.error.message)
      return
    }
    toast.success('Member removed from team')
    router.refresh()
  }

  const existingMemberIds = team.members.map((m) => m.userId)

  return (
    <section
      className={cn(
        '876-card flex min-w-0 flex-1 flex-col overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <header className="border-876-surface-border flex shrink-0 items-start gap-3.5 border-b px-6 py-5">
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl border',
            colorVariant.bg,
            colorVariant.text,
            colorVariant.border
          )}
        >
          <Users className="size-6" />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
              {team.name}
            </h2>
            <Badge variant={team.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {team.status === 'ACTIVE' ? 'Active' : 'Archived'}
            </Badge>
            {team.isDefault ? <Badge variant="info">Default</Badge> : null}
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {team.slug ? `${team.slug} · ` : ''}
            {team.members.length === 1
              ? '1 member'
              : `${team.members.length} members`}
            {team.color ? ` · ${team.color}` : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={`/settings/teams/${team.id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <Pencil className="size-3.5" />
            Edit
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" />}
              aria-label="More team actions"
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem
                onClick={toggleStatus}
                disabled={changingStatus}
              >
                {team.status === 'ACTIVE' ? 'Archive' : 'Restore'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <ArrowDownFromLine className="size-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close team details"
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div
        role="tablist"
        aria-label="Team details"
        className="border-876-surface-border shrink-0 border-b px-6 pt-3.5 pb-3"
      >
        <div className="bg-muted/60 inline-flex w-fit items-center gap-1 rounded-lg p-1">
          {DETAIL_TABS.map((entry) => (
            <button
              key={entry.value}
              type="button"
              role="tab"
              aria-selected={tab === entry.value}
              onClick={() => setTab(entry.value)}
              className={cn(
                'rounded-md px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                tab === entry.value
                  ? 'text-foreground bg-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
              {entry.value === 'members' && team.members.length > 0 ? (
                <span className="text-muted-foreground bg-muted ml-1.5 rounded-full px-1.5 py-0.5 text-[0.625rem]">
                  {team.members.length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div
        key={tab}
        role="tabpanel"
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 min-h-0 flex-1 overflow-y-auto p-6 motion-safe:duration-150 motion-safe:ease-out"
      >
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Description */}
            {team.description ? (
              <div className="border-876-surface-border bg-muted/20 rounded-xl border p-4">
                <p className="text-foreground text-xs leading-relaxed">
                  {team.description}
                </p>
              </div>
            ) : null}

            {/* Auto-Assignment Routing */}
            <div className="border-876-surface-border bg-muted/20 space-y-3 rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <Merge className="size-3.5" />
                  </span>
                  <div>
                    <span className="text-foreground block text-xs font-medium">
                      Auto-Assign
                    </span>
                    <span className="text-muted-foreground block text-[0.6875rem]">
                      {team.autoAssign === 'ROUND_ROBIN'
                        ? 'Distributes incoming requests evenly across members'
                        : team.autoAssign === 'LEAST_BUSY'
                          ? 'Assigns requests to the member with fewest active requests'
                          : 'Manual assignment only'}
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {AUTO_ASSIGN_LABELS[team.autoAssign]}
                </Badge>
              </div>
            </div>

            {/* Timestamps */}
            <div className="border-876-surface-border bg-muted/20 rounded-xl border p-4">
              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-muted-foreground text-[0.6875rem]">
                    Created
                  </dt>
                  <dd className="text-foreground mt-0.5 font-medium tabular-nums">
                    {formatDate(team.createdAt)}
                  </dd>
                </div>
                {team.updatedAt ? (
                  <div>
                    <dt className="text-muted-foreground text-[0.6875rem]">
                      Last Updated
                    </dt>
                    <dd className="text-foreground mt-0.5 font-medium tabular-nums">
                      {formatDate(team.updatedAt)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="space-y-4">
            {/* Add Member Form */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <MemberPicker
                  members={directory}
                  value={selectedMemberId}
                  onSelect={setSelectedMemberId}
                  exclude={existingMemberIds}
                  placeholder="Add a team member..."
                  emptyLabel="No members available to add"
                />
              </div>
              <Button
                type="button"
                variant="info"
                size="sm"
                onClick={handleAddMember}
                disabled={!selectedMemberId || addingMember}
                className="shrink-0"
              >
                Add Member
              </Button>
            </div>

            {/* Members Table */}
            <div className="border-876-surface-border overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="876-header-row">
                  <TableRow>
                    <TableHead className="px-4 py-3 text-xs font-semibold">
                      Member
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold">
                      Email
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-semibold">
                      Role
                    </TableHead>
                    <TableHead className="w-12 px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.members.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground py-8 text-center text-xs"
                      >
                        No members assigned to this team yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    team.members.map((member) => (
                      <TableRow key={member.userId}>
                        <TableCell className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <CustomerAvatar
                              name={member.name}
                              src={member.avatar}
                              className="size-7"
                            />
                            <span className="text-foreground text-xs font-medium">
                              {member.name}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground px-4 py-3 text-xs">
                          {member.email ?? '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge
                            variant={
                              member.role === 'LEAD' ? 'info' : 'outline'
                            }
                            className="text-[0.6875rem]"
                          >
                            {member.role === 'LEAD' ? 'Lead' : 'Member'}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon-sm" />}
                              aria-label={`Actions for ${member.name}`}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-36"
                            >
                              {member.role === 'MEMBER' ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.userId, 'LEAD')
                                  }
                                >
                                  Make lead
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.userId, 'MEMBER')
                                  }
                                >
                                  Make member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() =>
                                  handleRemoveMember(member.userId)
                                }
                              >
                                <Trash className="size-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-4">
            <ol className="relative space-y-4 ps-1">
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="bg-876-surface-border w-px grow" />
                </div>
                <div className="-mt-0.5 min-w-0 pb-2">
                  <p className="text-foreground text-xs font-medium">
                    Team created
                  </p>
                  <p className="text-muted-foreground text-[0.6875rem]">
                    {formatDateTime(team.createdAt)}
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" />
                </div>
                <div className="-mt-0.5 min-w-0">
                  <p className="text-foreground text-xs font-medium">
                    Current active status: {team.status}
                  </p>
                  <p className="text-muted-foreground text-[0.6875rem]">
                    {team.members.length} team members currently assigned
                  </p>
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/70 border-876-surface-border shrink-0 truncate border-t px-6 py-3 font-mono text-[0.6875rem]">
        {team.id}
      </p>
    </section>
  )
}
