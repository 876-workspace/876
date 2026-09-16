'use client'

import { RouteTabs, type RouteTabItem } from '@876/ui/route-tabs'

export function ProjectTabs({
  projectId,
  moduleTabs = [],
}: {
  projectId: string
  moduleTabs?: { key: string; label: string }[]
}) {
  const base = `/projects/${encodeURIComponent(projectId)}`
  const tabs: RouteTabItem[] = [
    {
      label: 'Overview',
      href: base,
      exact: true,
    },
    {
      label: 'Activity',
      href: `${base}/activity`,
    },
    {
      label: 'Discussions',
      href: `${base}/discussions`,
    },
    {
      label: 'Wiki',
      href: `${base}/wiki`,
    },
    {
      label: 'Clients',
      href: `${base}/clients`,
    },
    {
      label: 'Gantt',
      href: `${base}/gantt`,
    },
    {
      label: 'Time',
      href: `${base}/time`,
    },
    {
      label: 'Finance',
      href: `${base}/finance`,
    },
    ...moduleTabs.map((module) => ({
      label: module.label,
      href: `${base}/m/${encodeURIComponent(module.key)}`,
    })),
  ]

  return <RouteTabs tabs={tabs} className="mb-4" />
}
