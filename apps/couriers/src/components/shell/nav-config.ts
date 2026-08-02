import {
  BuildingOffice2Icon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LayoutList,
  Settings,
  Squares2X2Icon,
  UsersIcon,
} from '@876/ui/icons'
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
  label: string
  items: NavItem[]
}

export const nav: NavGroup[] = [
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
    ],
  },
  {
    label: '',
    items: [
      {
        title: 'Packages',
        href: '/packages',
        icon: LayoutList,
        color: 'var(--876-gold)',
        children: [
          { title: 'Pre-alerts', href: '/packages/pre-alerts' },
          { title: 'Manifests', href: '/packages/manifest' },
        ],
      },
      {
        title: 'Transactions',
        href: '#',
        icon: CreditCardIcon,
        color: 'var(--876-purple)',
        children: [
          { title: 'Invoices', href: '/invoices' },
          { title: 'Payments', href: '/payments' },
        ],
      },
      {
        title: 'Deliveries',
        href: '/deliveries',
        icon: GlobeAltIcon,
        color: 'var(--876-blue)',
      },
      {
        title: 'Warehouse',
        href: '/warehouse',
        icon: BuildingOffice2Icon,
        color: 'var(--876-orange)',
      },
    ],
  },
  {
    label: '',
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: Squares2X2Icon,
        color: 'var(--876-blue)',
      },
      {
        title: 'Documents',
        href: '/documents',
        icon: DocumentTextIcon,
        color: 'var(--876-green)',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--couriers-primary)',
      },
    ],
  },
]
