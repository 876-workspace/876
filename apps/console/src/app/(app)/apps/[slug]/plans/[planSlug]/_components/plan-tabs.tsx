'use client'

import { usePathname, useRouter } from 'next/navigation'

import { Tabs, TabsList, TabsTrigger } from '@876/ui/tabs'

export type PlanTab = {
  label: string
  href: string
  /** When true, only matches on an exact pathname (used for the index tab). */
  exact?: boolean
}

/**
 * Route-driven segmented tabs: the URL is the source of truth, so each
 * trigger deep-links like a normal tab strip while keeping the boxed shadcn
 * look. Sub-routes (e.g. `/pricing/new`) keep their parent tab active.
 */
export function PlanTabs({ tabs }: { tabs: PlanTab[] }) {
  const pathname = usePathname()
  const router = useRouter()

  const active =
    tabs.find((tab) =>
      tab.exact
        ? pathname === tab.href
        : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
    ) ?? tabs[0]

  return (
    <Tabs
      value={active.href}
      onValueChange={(value) => router.push(String(value))}
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.href} value={tab.href}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
