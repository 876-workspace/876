import type { ReactNode } from 'react'
import { PageBreadcrumb } from '@876/ui/page'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'

import { requireConsolePermission, requireSession } from '@/lib/auth/guards'
import { ROUTE_PERMISSIONS } from '@/lib/auth/route-permissions'
import { TeamSectionActions } from './_components/team-section-actions'

type Props = { children: ReactNode }

const tabs: DetailTab[] = [
  {
    label: 'Users',
    href: '/settings/users',
    excludePrefixes: ['/settings/users/roles'],
  },
  { label: 'Roles', href: '/settings/users/roles' },
]

export default async function MembersLayout({ children }: Props) {
  const sessionUser = await requireSession('/settings/users')
  await requireConsolePermission(
    sessionUser.id,
    ROUTE_PERMISSIONS['/settings/users']
  )

  return (
    <div>
      <div className="border-876-surface-border border-b">
        <div className="px-4 pt-5 pb-4 sm:px-6 lg:px-8">
          <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
          <h1 className="876-page-title">Team</h1>
        </div>
        <div className="flex items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <RouteTabs tabs={tabs} />
          <TeamSectionActions />
        </div>
      </div>
      <div>{children}</div>
    </div>
  )
}
