'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import type { RoleView } from '@/types/role'

import { DataTableColumnHeader } from '@876/ui/data-table-column-header'

import { ROLE_TYPE_PARAM, isRoleTypeFilter } from './roles-section'

const columns: ColumnDef<RoleView, unknown>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.description || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'memberCount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Members" />
    ),
  },
]

/**
 * The list column in both of its forms: the full-width table when no role is
 * open, and the condensed sidebar list when one is.
 */
export function RolesList({
  orgSlug,
  roles,
}: {
  orgSlug: string
  roles: RoleView[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const segments = useDetailSegments()
  const selectedId = segments[0] ?? null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`. A role is system when it carries a provisioned system key.
  const rawType = searchParams.get(ROLE_TYPE_PARAM)
  const type = isRoleTypeFilter(rawType) ? rawType : 'all'
  const visible =
    type === 'system'
      ? roles.filter((role) => role.systemKey !== null)
      : type === 'custom'
        ? roles.filter((role) => role.systemKey === null)
        : roles

  const roleHref = (id: string) => {
    const query = searchParams.toString()
    const base = `/${orgSlug}/settings/users/roles/${encodeURIComponent(id)}`
    return query ? `${base}?${query}` : base
  }

  if (!selectedId)
    return (
      <div className="876-card overflow-hidden">
        <DataTable
          columns={columns}
          data={visible}
          onRowClick={(role) => router.push(roleHref(role.id))}
          emptyState={
            <div className="text-muted-foreground py-6 text-center text-[0.8125rem]">
              No roles.
            </div>
          }
        />
      </div>
    )

  return (
    <ListPane>
      <ListPaneBody>
        {visible.length === 0 ? (
          <ListPaneEmpty>No roles match this view</ListPaneEmpty>
        ) : (
          visible.map((role) => (
            <ListPaneItem
              key={role.id}
              href={roleHref(role.id)}
              selected={role.id === selectedId}
              label={`View ${role.name} role`}
              title={role.name}
              subtitle={role.description || undefined}
              trailing={
                <Badge
                  variant={role.systemKey !== null ? 'outline' : 'secondary'}
                >
                  {role.systemKey !== null ? 'System' : 'Custom'}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
