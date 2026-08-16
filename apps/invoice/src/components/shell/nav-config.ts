import {
  BarChart3,
  Building2,
  CircleStackIcon,
  ClipboardList,
  Clock,
  CreditCard,
  ReceiptPercent,
  Settings,
  StickyNote,
  Users,
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
  label?: string
  className?: string
  items: NavItem[]
}

/**
 * 876 Invoice — scaled-down Billing parity nav.
 * Icons + colors mirror `apps/billing/src/components/shell/nav-config.ts`
 * so the two products feel identical:
 *  - Home: BarChart3 + var(--876-blue)  → billing Home
 *  - Customers: Users + var(--876-gold) → billing Customers
 *  - Items: CircleStackIcon + var(--876-blue) → billing Items
 *  - Quotes/Invoices/Sales Receipt: purple sales family (billing Sales)
 *  - Payments Received: CreditCard green (billing Banking/Payments)
 *  - Expenses: Building2 gold (billing Purchases)
 *  - Time Tracking: Clock blue
 *  - Reports: CreditCard green (billing Reports)
 *  - Settings: Settings blue (billing Settings)
 */
export const navConfig: NavGroup[] = [
  {
    items: [
      {
        title: 'Home',
        href: '/',
        icon: BarChart3,
        color: 'var(--876-blue)',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        color: 'var(--876-gold)',
      },
      {
        title: 'Items',
        href: '/items',
        icon: CircleStackIcon,
        color: 'var(--876-blue)',
      },
    ],
  },
  {
    items: [
      {
        title: 'Quotes',
        href: '/quotes',
        icon: StickyNote,
        color: 'var(--876-purple)',
      },
      {
        title: 'Invoices',
        href: '/invoices',
        icon: ClipboardList,
        color: 'var(--876-purple)',
      },
      {
        title: 'Sales Receipt',
        href: '/sales-receipts',
        icon: ReceiptPercent,
        color: 'var(--876-purple)',
      },
      {
        title: 'Payments Received',
        href: '/payments',
        icon: CreditCard,
        color: 'var(--876-green)',
      },
    ],
  },
  {
    items: [
      {
        title: 'Expenses',
        href: '/expenses',
        icon: Building2,
        color: 'var(--876-gold)',
      },
    ],
  },
  {
    className: 'mt-auto',
    items: [
      {
        title: 'Time Tracking',
        href: '/time-tracking',
        icon: Clock,
        color: 'var(--876-blue)',
      },
      {
        title: 'Reports',
        href: '/reports',
        icon: CreditCard,
        color: 'var(--876-green)',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--876-blue)',
      },
    ],
  },
]
