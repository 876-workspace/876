import { Suspense, type ReactNode } from 'react'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { RoleView } from '@/types/role'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { records } from '@/lib/records'
import { AnalyticsEvent } from '@/lib/analytics/events'
import { TrackMCEventOnMount } from '@/lib/analytics/track-event-on-mount'
import { RolesList } from './_components/roles-list'
import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'
import { RolesShell } from './_components/roles-shell'

export default async function RolesLayout({
  children,
}: {
  children: ReactNode
}) {
  const sessionUser = await requireSession('/settings/users/roles')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/settings/users/roles']
  )
  return (
    <RolesShell
      list={
        <Suspense
          fallback={<DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />}
        >
          <RolesListData />
        </Suspense>
      }
    >
      {children}
    </RolesShell>
  )
}

async function RolesListData() {
  const rows = await records.roles.list()
  const roles: RoleView[] = rows.map((role) => ({
    name: role.name,
    displayName: role.displayName,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.isSystem,
    userCount: role._count.members,
  }))
  const sorted = [
    ...roles
      .filter((role) => role.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name)),
    ...roles
      .filter((role) => !role.isSystem)
      .sort((a, b) => a.name.localeCompare(b.name)),
  ]

  return (
    <>
      <TrackMCEventOnMount event={AnalyticsEvent.RoleListViewed} />
      <RolesList roles={sorted} />
    </>
  )
}
