import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  LayoutList,
  Squares2X2Icon,
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
        title: 'Items',
        href: '/items',
        icon: ClipboardDocumentListIcon,
        color: 'var(--876-orange)',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: UsersIcon,
        color: 'var(--876-green)',
      },
      {
        title: 'Packages',
        href: '/packages',
        icon: LayoutList,
        color: 'var(--876-gold)',
        children: [
          { title: 'Pre-alerts', href: '/packages/pre-alerts' },
          { title: 'Warehouse', href: '/packages/warehouse' },
          { title: 'Manifests', href: '/packages/manifest' },
          { title: 'Deliveries', href: '/packages/deliveries' },
        ],
      },
      {
        title: 'Billing',
        href: '#',
        icon: CreditCardIcon,
        color: 'var(--876-purple)',
        children: [
          { title: 'Invoices', href: '/invoices' },
          { title: 'Payments', href: '/payments' },
        ],
      },
      {
        title: 'Reports',
        href: '/reports',
        icon: Squares2X2Icon,
        color: 'var(--876-blue)',
      },
    ],
  },
]
