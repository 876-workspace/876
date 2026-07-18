import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@876/ui/table'
import { service } from '@/lib/service'

import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { RolesTableRow } from './roles-table-row'
import type { RoleView } from '@/types/role'
import { Page } from '@876/ui/page'

export const metadata = { title: 'Roles & Permissions - Settings' }

export default async function RolesPermissionsPage() {
  const rows = await service.roles.list()

  const roles: RoleView[] = rows.map((r) => ({
    name: r.name,
    displayName: r.displayName,
    description: r.description,
    permissions: r.permissions,
    isSystem: r.isSystem,
    userCount: r._count.members,
  }))

  // System roles first, then custom, alphabetically within each group
  const sorted = [
    ...roles
      .filter((r) => r.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name)),
    ...roles
      .filter((r) => !r.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ]

  return (
    <Page>
      <TrackMCEventOnMount event={AnalyticsEvent.RoleListViewed} />

      <div className="876-card overflow-hidden">
        <Table>
          <TableHeader className="876-header-row">
            <TableRow>
              <TableHead className="px-5 py-3.5">Role</TableHead>
              <TableHead className="px-5 py-3.5">Type</TableHead>
              <TableHead className="px-5 py-3.5">Permissions</TableHead>
              <TableHead className="px-5 py-3.5">Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-muted-foreground px-5 py-8 text-center text-sm"
                >
                  No roles found.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((role) => (
                <RolesTableRow key={role.name} role={role} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Page>
  )
}
