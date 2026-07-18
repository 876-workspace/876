import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  LayoutList,
  UsersIcon,
} from '@876/ui/icons'
import type { IconComponent } from '@876/ui/icons'

export type CouriersNavChild = {
  title: string
  href: string
}

export type CouriersNavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  children?: CouriersNavChild[]
}

export type CouriersNavGroup = {
  label: string
  items: CouriersNavItem[]
}

export const couriersNav: CouriersNavGroup[] = [
  {
    label: '',
    items: [
      {
        title: 'Dashboard',
        href: '',
        icon: ChartBarIcon,
        color: 'var(--876-blue)',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: UsersIcon,
        color: 'var(--876-green)',
      },
      {
        title: 'Items',
        href: '/items',
        icon: ClipboardDocumentListIcon,
        color: 'var(--876-orange)',
      },
      {
        title: 'Packages',
        href: '/packages',
        icon: LayoutList,
        color: 'var(--876-gold)',
        children: [
          { title: 'Pre-alerts', href: '/packages/pre-alerts' },
          { title: 'Deliveries', href: '/packages/deliveries' },
          { title: 'Warehouse', href: '/packages/warehouse' },
          { title: 'Manifest', href: '/packages/manifest' },
        ],
      },
    ],
  },
]
