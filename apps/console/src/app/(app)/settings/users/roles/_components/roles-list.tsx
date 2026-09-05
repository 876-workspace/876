'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDetailSegments } from '@876/ui/list-detail-shell'
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
import { CondensedRolesTableRow, RolesTableRow } from './roles-table-row'

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
    <div className="876-card overflow-hidden">
      <Table className="table-fixed">
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground px-4 py-8 text-center text-xs">
                No roles match this view
              </TableCell>
            </TableRow>
          ) : (
            rows.map((role) => (
              <CondensedRolesTableRow
                key={role.name}
                role={role}
                selected={role.name === selectedName}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
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
