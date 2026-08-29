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
import { Plus } from '@876/ui/icons'
import { buttonVariants } from '@876/ui/button'
import Link from 'next/link'
import { RolesTableRow } from '../_components/roles-table-row'
import type { RoleView } from '@/types/role'
import { Page, PageBreadcrumb } from '@876/ui/page'
import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ROLES_SKELETON_COLUMNS } from '../_components/roles-skeleton-columns'

export const metadata = { title: 'Roles - Settings' }

export default function RolesPermissionsPage() {
  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="876-page-title">Roles</h1>
        <Link
          href="/settings/users/roles/new"
          className={buttonVariants({ variant: 'info', size: 'sm' })}
        >
          <Plus className="size-4" strokeWidth={2.25} />
          Add
        </Link>
      </div>
      <TrackMCEventOnMount event={AnalyticsEvent.RoleListViewed} />
      <Suspense
        fallback={<DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />}
      >
        <RolesTableData />
      </Suspense>
    </Page>
  )
}

async function RolesTableData() {
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
                className="text-muted-foreground px-5 py-8 text-center text-[0.8125rem]"
              >
                No roles found.
              </TableCell>
            </TableRow>
          ) : (
            sorted.map((role) => <RolesTableRow key={role.name} role={role} />)
          )}
        </TableBody>
      </Table>
    </div>
  )
}
