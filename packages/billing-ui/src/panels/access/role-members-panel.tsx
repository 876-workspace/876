'use client'

import Link from 'next/link'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Empty, EmptyTitle } from '@876/ui/empty'

import type { FinanceMemberSummary } from './types'

export const ROLE_MEMBERS_SKELETON_COLUMNS = [
  { label: 'Member', cell: 'text' as const },
  { label: 'Status', cell: 'badge' as const },
  { label: 'Joined', cell: 'text' as const },
]

type RoleMembersPanelProps = {
  members: FinanceMemberSummary[]
  state:
    | { status: 'loading' }
    | { status: 'ready' }
    | { status: 'error'; error: { code: string; message: string } }
  memberHref: (userId: string) => string
  formatDate: (value: number | null) => string
  /** Rendered above the table when the role holds nobody. */
  emptyLabel?: string
}

/** Keeps loading fallbacks coupled to the members table's actual columns. */
export function RoleMembersPanelSkeleton() {
  return <DataTableSkeleton columns={ROLE_MEMBERS_SKELETON_COLUMNS} />
}

export function RoleMembersPanel({
  members,
  state,
  memberHref,
  formatDate,
  emptyLabel = 'No members hold this role',
}: RoleMembersPanelProps) {
  const columns: ColumnDef<FinanceMemberSummary, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Member" />
      ),
      cell: ({ row }) => {
        const { email, name, userId } = row.original

        return (
          <div className="min-w-0">
            <Link
              href={memberHref(userId)}
              className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              {name || '—'}
            </Link>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {email || '—'}
            </p>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'ACTIVE' ? 'secondary' : 'outline'}>
          {row.original.status === 'ACTIVE' ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      accessorKey: 'joinedAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.joinedAt ?? null)}
        </span>
      ),
    },
  ]

  if (state.status === 'loading') return <RoleMembersPanelSkeleton />

  return (
    <div className="space-y-3">
      {state.status === 'error' ? (
        <div role="status" className="text-destructive text-sm">
          {state.error.message}
        </div>
      ) : null}
      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={members}
          className="text-[0.8125rem]"
          emptyState={
            <Empty>
              <EmptyTitle>{emptyLabel}</EmptyTitle>
            </Empty>
          }
        />
      </div>
    </div>
  )
}
