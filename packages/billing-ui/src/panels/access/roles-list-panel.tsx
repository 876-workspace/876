'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { LegacyColumnDef as ColumnDef } from '@tanstack/react-table/legacy'

import { Link } from '../../link'
import { Badge } from '@876/ui/badge'
import { DataTable } from '@876/ui/data-table'
import { DataTableColumnHeader } from '@876/ui/data-table-column-header'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import type { FinanceRoleSummary } from './types'

export const ROLES_SKELETON_COLUMNS = [
  { label: 'Role', cell: 'text' as const },
  { label: 'Type', cell: 'badge' as const },
  { label: 'Default', cell: 'badge' as const },
  { label: 'Permissions', cell: 'text' as const },
  { label: 'Members', cell: 'text' as const },
]

type ListState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; error: { code: string; message: string } }

type Props = {
  roles: FinanceRoleSummary[]
  state: ListState
  detailHref: (roleId: string) => string
  typeFilter: 'all' | 'system' | 'custom'
}

/**
 * The roles list, in both of its forms.
 *
 * The full table and the condensed pane live in one component so the selection
 * cannot remount the list when a role opens, and so the two cannot disagree
 * about what a row says.
 *
 * The table is deliberately the same object as the customers and items tables
 * in both finance apps — `876-card` around a `DataTable` with sortable
 * `DataTableColumnHeader`s, the 13px row type, a sky-blue row title, muted
 * supporting cells, right-aligned `tabular-nums` counts, and a clickable row.
 * A settings section that styles its own table reads as a different product.
 */
export function RolesListPanel({
  roles,
  state,
  detailHref,
  typeFilter,
}: Props) {
  const router = useRouter()
  const segments = useDetailSegments()
  const selectedId = segments[0] ?? null
  const rows = useMemo(() => {
    if (typeFilter === 'system') return roles.filter((role) => role.isSystem)
    if (typeFilter === 'custom') return roles.filter((role) => !role.isSystem)
    return roles
  }, [roles, typeFilter])

  const columns: ColumnDef<FinanceRoleSummary, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link
            href={detailHref(row.original.id)}
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
          {row.original.description ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {row.original.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'isSystem',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant={row.original.isSystem ? 'outline' : 'secondary'}>
          {row.original.isSystem ? 'System' : 'Custom'}
        </Badge>
      ),
    },
    {
      accessorKey: 'isDefault',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Default" />
      ),
      cell: ({ row }) =>
        row.original.isDefault ? (
          <Badge variant="outline">Default</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: 'permissions',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Permissions" />
        </div>
      ),
      accessorFn: (role) => role.permissions.length,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-right tabular-nums">
          {row.original.permissions.length}
        </div>
      ),
    },
    {
      accessorKey: 'memberCount',
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Members" />
        </div>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {row.original.memberCount}
        </div>
      ),
    },
  ]

  if (state.status === 'loading')
    return <DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />

  if (selectedId)
    return (
      <ListPane className="h-full">
        <ListPaneBody>
          {rows.length === 0 ? (
            <ListPaneEmpty>No roles match this view.</ListPaneEmpty>
          ) : (
            rows.map((role) => (
              <ListPaneItem
                key={role.id}
                href={detailHref(role.id)}
                selected={role.id === selectedId}
                label={`View ${role.name} role`}
                title={
                  <span className="text-sky-600 dark:text-sky-400">
                    {role.name}
                  </span>
                }
                subtitle={`${role.permissions.length} permissions · ${role.memberCount} members`}
                trailing={<RoleBadges role={role} compact />}
              />
            ))
          )}
        </ListPaneBody>
      </ListPane>
    )

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
          data={rows}
          className="text-[0.8125rem]"
          emptyState={
            <span className="text-muted-foreground">
              No roles match this view.
            </span>
          }
          onRowClick={(role) => router.push(detailHref(role.id))}
        />
      </div>
    </div>
  )
}

function RoleBadges({
  role,
  compact = false,
}: {
  role: FinanceRoleSummary
  compact?: boolean
}) {
  return (
    <span className={compact ? 'flex flex-col items-end gap-1' : 'flex gap-1'}>
      <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
        {role.isSystem ? 'System' : 'Custom'}
      </Badge>
      {role.isDefault ? <Badge variant="outline">Default</Badge> : null}
    </span>
  )
}
