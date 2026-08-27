'use client'

import Link from 'next/link'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { formatDate } from '@876/core/timestamps'
import { Badge } from '@876/ui/badge'
import { buttonVariants } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@876/ui/empty'
import type { CrmTeamAutoAssign, CrmTeamStatus } from '@/types/crm'
import type { DirectoryMember } from '@/features/directory/types'

export type TeamRow = {
  id: string
  name: string
  members: DirectoryMember[]
  isDefault: boolean
  autoAssign: CrmTeamAutoAssign
  status: CrmTeamStatus
  createdAt: number
}

const AUTO_ASSIGN_LABELS: Record<CrmTeamAutoAssign, string> = {
  NONE: 'None',
  ROUND_ROBIN: 'Round robin',
  LEAST_BUSY: 'Least busy',
}

const emptyState = (
  <Empty className="py-14">
    <EmptyHeader>
      <EmptyTitle>No teams yet</EmptyTitle>
    </EmptyHeader>
    <EmptyContent>
      <Link
        href="/settings/teams/new"
        className={buttonVariants({ variant: 'info', size: 'sm' })}
      >
        Add
      </Link>
    </EmptyContent>
  </Empty>
)

function MemberStack({ members }: { members: DirectoryMember[] }) {
  const visible = members.slice(0, 3)
  const overflow = members.length - visible.length

  if (members.length === 0)
    return <span className="text-muted-foreground">—</span>

  return (
    <div className="flex items-center">
      <div className="flex -space-x-1.5">
        {visible.map((member) => (
          <CustomerAvatar
            key={member.userId}
            name={member.name}
            src={member.avatar}
            className="ring-background ring-2"
          />
        ))}
      </div>
      {overflow > 0 ? (
        <span className="text-muted-foreground ml-2 text-xs tabular-nums">
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

export function TeamsTable({ teams }: { teams: TeamRow[] }) {
  const columns: ColumnDef<TeamRow, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/settings/teams/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'members',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      cell: ({ row }) => <MemberStack members={row.original.members} />,
    },
    {
      accessorKey: 'isDefault',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Default" />
      ),
      cell: ({ row }) =>
        row.original.isDefault ? (
          <Badge variant="info">Default</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: 'autoAssign',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Auto-assign" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {AUTO_ASSIGN_LABELS[row.original.autoAssign]}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'ACTIVE' ? 'success' : 'secondary'}
        >
          {row.original.status === 'ACTIVE' ? 'Active' : 'Archived'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap tabular-nums">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <div className="876-card overflow-hidden">
      <DataTable columns={columns} data={teams} emptyState={emptyState} />
    </div>
  )
}
