import {
  BarChart3,
  ClipboardList,
  DocumentTextIcon,
  Settings,
  Users,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

/** A top-level sidebar item. */
export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  colorClassName?: string
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
        colorClassName: 'text-blue-500 dark:text-blue-400',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        colorClassName: 'text-amber-500 dark:text-amber-400',
      },
      {
        title: 'Requests',
        href: '/requests',
        icon: ClipboardList,
        colorClassName: 'text-purple-500 dark:text-purple-400',
      },
      {
        title: 'Forms',
        href: '/forms',
        icon: DocumentTextIcon,
        colorClassName: 'text-emerald-500 dark:text-emerald-400',
      },
    ],
  },
  {
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        colorClassName: 'text-slate-500 dark:text-slate-400',
      },
    ],
  },
]
