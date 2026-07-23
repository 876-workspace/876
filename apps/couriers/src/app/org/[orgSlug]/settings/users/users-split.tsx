'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

import type { TeamMemberRow, TeamRoleOption } from '@/types/team'

import { memberInitials } from './member-initials'
import { UserDetail } from './user-detail'

type Props = {
  rows: TeamMemberRow[]
  roles: TeamRoleOption[]
  selectedId?: string
  orgSlug: string
}

const userColumn: ColumnDef<TeamMemberRow, unknown> = {
  id: 'user',
  header: 'User',
  cell: ({ row }) => <UserCell row={row.original} />,
}

const fullColumns: ColumnDef<TeamMemberRow, unknown>[] = [
  userColumn,
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) => <span className="text-sm">{row.original.roleName}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === 'active' ? 'success' : 'secondary'}
      >
        {row.original.status === 'active' ? 'Active' : 'Inactive'}
      </Badge>
    ),
  },
]

export function UsersSplit({ rows, roles, selectedId, orgSlug }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selected = rows.find((row) => row.id === selectedId)

  function selectUser(id?: string) {
    const next = new URLSearchParams(searchParams.toString())

    if (id) next.set('user', id)
    else next.delete('user')

    const query = next.toString()
    router.push(query ? `?${query}` : `/org/${orgSlug}/settings/users`)
  }

  if (!selected)
    return (
      <div className="876-card overflow-hidden">
        <DataTable
          columns={fullColumns}
          data={rows}
          onRowClick={(row) => selectUser(row.id)}
          emptyState={
            <div className="text-muted-foreground py-6 text-center text-sm">
              No users.
            </div>
          }
        />
      </div>
    )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,320px)_1fr] lg:items-start">
      <div className="876-card self-start overflow-hidden">
        <DataTable
          columns={[userColumn]}
          data={rows}
          onRowClick={(row) => selectUser(row.id)}
        />
      </div>
      <UserDetail
        key={selected.id}
        row={selected}
        roles={roles}
        orgSlug={orgSlug}
        onClose={() => selectUser()}
      />
    </div>
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
