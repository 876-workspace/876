'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { AdminOrgMember, AdminUser } from '@876/admin'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@876/ui/empty'
import { Users } from '@876/ui/icons'
import { cn } from '@876/core/utils'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@/lib/format'
import {
  initialsOf,
  memberDisplayName,
  memberStatusBadgeClass,
  roleBadgeClass,
} from './member-format'
import { MemberDetail } from './member-detail'

/** Exit animation length; keep in step with the panel's `animate-out`. */
const EXIT_MS = 200

type Props = {
  members: AdminOrgMember[]
  user?: AdminUser | null
  /** Streamed assigned apps for the selected member. */
  apps?: React.ReactNode
  /** Lifecycle timeline for the selected member. */
  activity?: React.ReactNode
  /** The `?member=` id, resolved server-side. */
  selectedId?: string
  basePath: string
}

/** The condensed column shown once a member is selected. */
const memberColumn: ColumnDef<AdminOrgMember, unknown> = {
  id: 'member',
  header: 'Member',
  cell: ({ row }) => {
    const member = row.original
    const name = memberDisplayName(member)

    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar className="size-6 shrink-0 rounded-full after:rounded-full">
          {member.avatar && (
            <AvatarImage src={member.avatar} alt="" className="rounded-full" />
          )}
          <AvatarFallback className="rounded-full text-[0.5625rem]">
            {initialsOf(member)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium text-sky-600 dark:text-sky-400">
            {name}
          </span>
          <span className="text-muted-foreground truncate text-xs">
            {member.email ?? member.role}
          </span>
        </div>
      </div>
    )
  },
}

const fullColumns: ColumnDef<AdminOrgMember, unknown>[] = [
  {
    id: 'name',
    accessorFn: memberDisplayName,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => {
      const member = row.original
      const name = memberDisplayName(member)

      return (
        <div className="flex items-center gap-3">
          <Avatar className="size-6 shrink-0 rounded-full after:rounded-full">
            {member.avatar && (
              <AvatarImage
                src={member.avatar}
                alt=""
                className="rounded-full"
              />
            )}
            <AvatarFallback className="rounded-full text-[0.5625rem]">
              {initialsOf(member)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
            {name}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Email" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {row.original.email ?? '—'}
      </span>
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          roleBadgeClass(row.original.role)
        )}
      >
        {row.original.role}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <span
        className={cn(
          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
          memberStatusBadgeClass(row.original.status)
        )}
      >
        {row.original.status}
      </span>
    ),
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Joined" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground text-[0.8125rem]">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
]

export function MembersSplit({
  members,
  user,
  apps,
  activity,
  selectedId,
  basePath,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = members.find(
    (m) => m.id === selectedId || m.user_id === selectedId
  )

  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Whether the panel is opening from nothing or switching between rows drives
  // which entrance animation runs. It is derived by comparing the selection
  // against the one the last render saw, which is React's adjust-state-during-
  // render pattern — a ref cannot hold it, because reading or writing one
  // during render is exactly what `react-hooks/refs` forbids.
  const [entrance, setEntrance] = useState<{
    id?: string
    kind: 'open' | 'switch'
  }>({ id: selectedId, kind: 'switch' })

  if (entrance.id !== selectedId) {
    setEntrance({
      id: selectedId,
      kind: entrance.id === undefined ? 'open' : 'switch',
    })
  }

  const isSwitch = entrance.kind === 'switch'

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  const [today] = useState(() => Math.floor(Date.now() / 86_400_000) * 86_400)

  function select(id?: string) {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    if (closing) setClosing(false)

    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('member', id)
    else next.delete('member')

    const query = next.toString()
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  function requestClose() {
    if (closing) return
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      setClosing(false)
      select()
    }, EXIT_MS)
  }

  if (!selected) {
    return (
      <div className="876-card overflow-hidden">
        <DataTable
          columns={fullColumns}
          data={members}
          onRowClick={(member) => select(member.id)}
          emptyState={<MembersEmptyState />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="876-card shrink-0 overflow-hidden md:w-72 lg:w-80">
        <DataTable
          columns={[memberColumn]}
          data={members}
          onRowClick={(member) => select(member.id)}
        />
      </div>
      <MemberDetail
        key={selected.id}
        member={selected}
        user={user}
        apps={apps}
        activity={activity}
        now={today}
        onClose={requestClose}
        className={cn(
          'motion-safe:duration-300 motion-safe:ease-out',
          closing
            ? 'motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-right-4 motion-safe:fill-mode-forwards motion-safe:duration-200 motion-safe:ease-in'
            : isSwitch
              ? 'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200'
              : 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-4'
        )}
      />
    </div>
  )
}

function MembersEmptyState() {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No members</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}
