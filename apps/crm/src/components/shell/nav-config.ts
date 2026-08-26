import { BarChart3, ClipboardList, Settings, Users } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

/** A top-level sidebar item. */
export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
}

export type NavGroup = {
  items: NavItem[]
}

/** Unlabelled CRM navigation groups rendered in sidebar order. */
export const navConfig: NavGroup[] = [
  {
    items: [
      {
        title: 'Dashboard',
        href: '/',
        icon: BarChart3,
        color: 'var(--876-blue)',
      },
      { title: 'Customers', href: '/customers', icon: Users },
      { title: 'Requests', href: '/requests', icon: ClipboardList },
    ],
  },
  {
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
]
