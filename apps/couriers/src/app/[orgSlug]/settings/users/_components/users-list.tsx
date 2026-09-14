'use client'

import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import type { TeamMemberRow, TeamMemberStatusValue } from '@/types/team'

import { memberInitials } from '../_lib/member-initials'

type Props = {
  rows: TeamMemberRow[]
  orgSlug: string
  /** Rendered below the full-width table while no member is open. */
  pending?: ReactNode
}

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

const TEAM_MEMBER_STATUSES: readonly TeamMemberStatusValue[] = [
  'active',
  'inactive',
]

const userColumn: ColumnDef<TeamMemberRow, unknown> = {
  id: 'user',
  header: 'User',
  cell: ({ row }) => <UserCell row={row.original} />,
}

const fullColumns: ColumnDef<TeamMemberRow, unknown>[] = [
  userColumn,
  {
    id: 'role',
    accessorKey: 'roleName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => (
      <span className="text-[0.8125rem]">{row.original.roleName}</span>
    ),
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'active' ? 'success' : 'secondary'}
      >
        {row.original.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
]

/**
 * The list column in both of its forms: the full-width table when no member
 * is open, and the condensed sidebar list when one is.
 */
export function UsersList({ rows, orgSlug, pending }: Props) {
  const router = useRouter()
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedId = segments[0] ?? null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`.
  const statusParam = searchParams.get('status')
  const status = TEAM_MEMBER_STATUSES.some((value) => value === statusParam)
    ? statusParam
    : 'all'
  const visible =
    status === 'all' ? rows : rows.filter((row) => row.status === status)

  const memberHref = (id: string) => {
    const query = searchParams.toString()
    const base = `/${orgSlug}/settings/users/${encodeURIComponent(id)}`
    return query ? `${base}?${query}` : base
  }

  if (!selectedId)
    return (
      <>
        <div className="876-card overflow-hidden">
          <DataTable
            columns={fullColumns}
            data={visible}
            onRowClick={(row) => router.push(memberHref(row.id))}
            emptyState={
              <div className="text-muted-foreground py-6 text-center text-[0.8125rem]">
                No users.
              </div>
            }
          />
        </div>
        {pending}
      </>
    )

  return (
    <ListPane>
      <ListPaneBody>
        {visible.length === 0 ? (
          <ListPaneEmpty>No users match this view</ListPaneEmpty>
        ) : (
          visible.map((row) => (
            <ListPaneItem
              key={row.id}
              href={memberHref(row.id)}
              selected={row.id === selectedId}
              label={`View user ${row.name}`}
              leading={
                <Avatar className="size-7">
                  {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
                  <AvatarFallback className="text-[0.5625rem]">
                    {memberInitials(row.name)}
                  </AvatarFallback>
                </Avatar>
              }
              title={row.name}
              subtitle={row.email ?? row.userId}
              trailing={
                row.status === 'active' ? null : (
                  <Badge variant="secondary">Inactive</Badge>
                )
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function UserCell({ row }: { row: TeamMemberRow }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="sm">
        {row.avatar ? <AvatarImage src={row.avatar} alt="" /> : null}
        <AvatarFallback>{memberInitials(row.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium">{row.name}</div>
        <div className="text-muted-foreground truncate text-xs">
          {row.email ?? row.userId}
        </div>
      </div>
    </div>
  )
}
