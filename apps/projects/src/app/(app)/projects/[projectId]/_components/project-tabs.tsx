'use client'

import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

export function ProjectTabs({ projectId }: { projectId: string }) {
  const tabs: RouteTabItem[] = [
    {
      label: 'Overview',
      href: `/projects/${encodeURIComponent(projectId)}`,
      exact: true,
    },
    {
      label: 'Gantt',
      href: `/projects/${encodeURIComponent(projectId)}/gantt`,
    },
  ]

  return <RouteTabs tabs={tabs} className="mb-4" />
}
