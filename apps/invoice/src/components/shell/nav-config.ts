import { BarChart3, ClipboardList, Settings, Users } from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

export type NavChild = {
  title: string
  href: string
}

export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  children?: NavChild[]
}

export type NavGroup = {
  label?: string
  className?: string
  items: NavItem[]
}

export const navConfig: NavGroup[] = [
  {
    items: [
      {
        title: 'Overview',
        href: '/',
        icon: BarChart3,
        color: 'var(--876-blue)',
      },
      {
        title: 'Invoices',
        href: '/invoices',
        icon: ClipboardList,
        color: 'var(--876-purple)',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        color: 'var(--876-gold)',
      },
    ],
  },
  {
    className: 'mt-auto',
    items: [
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--876-blue)',
      },
    ],
  },
]
