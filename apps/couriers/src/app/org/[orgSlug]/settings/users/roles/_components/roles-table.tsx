'use client'

import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'

import type { RoleView } from '@/types/role'

const columns: ColumnDef<RoleView, unknown>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-medium">
        {row.original.name}
        {row.original.systemKey ? (
          <Badge variant="outline">Default</Badge>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.description || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'memberCount',
    header: 'Members',
  },
]

export function RolesTable({
  orgSlug,
  roles,
}: {
  orgSlug: string
  roles: RoleView[]
}) {
  const router = useRouter()

  return (
    <div className="876-card overflow-hidden">
      <DataTable
        columns={columns}
        data={roles}
        onRowClick={(role) =>
          router.push(
            `/org/${orgSlug}/settings/users/roles/${encodeURIComponent(role.id)}`
          )
        }
        emptyState={
          <div className="text-muted-foreground py-6 text-center text-sm">
            No roles.
          </div>
        }
      />
    </div>
  )
}
