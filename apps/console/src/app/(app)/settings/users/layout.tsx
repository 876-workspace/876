import type { ReactNode } from 'react'
import { RouteTabs, type RouteTabItem as DetailTab } from '@876/ui/route-tabs'
import { TeamSectionActions } from './team-section-actions'
import { PageBreadcrumb } from '@876/ui/page'

type Props = { children: ReactNode }

const tabs: DetailTab[] = [
  {
    label: 'Users',
    href: '/settings/users',
    excludePrefixes: ['/settings/users/roles'],
  },
  { label: 'Roles', href: '/settings/users/roles' },
]

export default function MembersLayout({ children }: Props) {
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
