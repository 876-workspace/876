'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Badge } from '@876/ui/badge'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import type { RoleView } from '@/types/role'

import { ROLE_TYPE_PARAM } from './roles-shell'
import { RolesTableRow } from './roles-table-row'

export function RolesList({ roles }: { roles: RoleView[] }) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const selectedName = segments[0] ?? null

  // Applied here rather than in the loader because a layout receives no
  // `searchParams`.
  const type = searchParams.get(ROLE_TYPE_PARAM) ?? 'all'
  const rows = useMemo(() => {
    if (type === 'system') return roles.filter((role) => role.isSystem)
    if (type === 'custom') return roles.filter((role) => !role.isSystem)
    return roles
  }, [roles, type])

  if (!selectedName) {
    return (
      <div className="876-card overflow-hidden">
        <Table>
          <RolesTableHeader />
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground px-5 py-8 text-center text-[0.8125rem]"
                >
                  No roles match this view.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((role) => <RolesTableRow key={role.name} role={role} />)
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No roles match this view</ListPaneEmpty>
        ) : (
          rows.map((role) => {
            const query = searchParams.toString()
            const href = query
              ? `/settings/users/roles/${encodeURIComponent(role.name)}?${query}`
              : `/settings/users/roles/${encodeURIComponent(role.name)}`

            return (
              <ListPaneItem
                key={role.name}
                href={href}
                selected={role.name === selectedName}
                label={`View ${role.displayName} role`}
                title={role.displayName}
                subtitle={role.name}
                trailing={
                  <Badge variant={role.isSystem ? 'outline' : 'secondary'}>
                    {role.isSystem ? 'System' : 'Custom'}
                  </Badge>
                }
              />
            )
          })
        )}
      </ListPaneBody>
    </ListPane>
  )
}

function RolesTableHeader() {
  return (
    <TableHeader className="876-header-row">
      <TableRow>
        <TableHead className="px-5 py-3.5">Role</TableHead>
        <TableHead className="px-5 py-3.5">Type</TableHead>
        <TableHead className="px-5 py-3.5">Permissions</TableHead>
        <TableHead className="px-5 py-3.5">Users</TableHead>
      </TableRow>
    </TableHeader>
  )
}
