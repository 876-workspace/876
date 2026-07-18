import {
  BarChart3,
  Building2,
  CircleStackIcon,
  ClipboardList,
  CreditCard,
  Globe2,
  KeyRound,
  RefreshCw,
  Settings,
  StickyNote,
  Users,
  type IconComponent,
} from '@876/ui/icons'
import type { Permission } from '@/types/access'
import type {
  BillingProductFeature,
  BillingProductFeatures,
} from '@/types/features'

export type NavChild = {
  title: string
  href: string
  feature?: BillingProductFeature
  permission?: Permission
}

export type NavItem = {
  title: string
  href: string
  icon: IconComponent
  color?: string
  children?: NavChild[]
  permission: Permission
  feature?: BillingProductFeature
}

export type NavGroup = {
  label: string
  className?: string
  items: NavItem[]
}

/**
 * Billing navigation separates invoicing, purchases, and subscription
 * management. Product flags are evaluated on the server and passed into the
 * sidebar as booleans; the browser never evaluates PostHog keys.
 */
export const Nav: NavGroup[] = [
  {
    label: '',
    items: [
      {
        title: 'Home',
        href: '/',
        icon: BarChart3,
        color: 'var(--876-blue)',
        permission: 'dashboard:read',
      },
      {
        title: 'Customers',
        href: '/customers',
        icon: Users,
        color: 'var(--876-gold)',
        permission: 'customers:read',
      },
      {
        title: 'Items',
        href: '/items',
        icon: CircleStackIcon,
        color: 'var(--876-blue)',
        permission: 'catalog:read',
      },
      {
        title: 'Sales',
        href: '/quotes',
        icon: ClipboardList,
        color: 'var(--876-purple)',
        permission: 'sales:read',
        feature: 'sales',
        children: [
          {
            title: 'Quotes',
            href: '/quotes',
            feature: 'quotes',
          },
          {
            title: 'Estimates',
            href: '/estimates',
            feature: 'estimates',
          },
          {
            title: 'Invoices',
            href: '/invoices',
            feature: 'invoices',
          },
          {
            title: 'Credit Notes',
            href: '/credit-notes',
            feature: 'invoices',
          },
          {
            title: 'Payments Received',
            href: '/payments',
            permission: 'payments:read',
          },
        ],
      },
      {
        title: 'Subscriptions',
        href: '/subscriptions',
        icon: RefreshCw,
        color: 'var(--876-orange)',
        permission: 'subscriptions:read',
        feature: 'subscriptions',
        children: [
          { title: 'Products', href: '/products' },
          { title: 'Plans', href: '/plans' },
          { title: 'Add-ons', href: '/addons' },
          { title: 'Prices', href: '/prices' },
          { title: 'Coupons', href: '/coupons' },
          { title: 'Price Lists', href: '/price-lists' },
        ],
      },
    ],
  },
  {
    label: '',
    items: [
      {
        title: 'Purchases',
        href: '/purchases/vendors',
        icon: Building2,
        color: 'var(--876-gold)',
        permission: 'billing:access',
        feature: 'purchases',
        children: [
          {
            title: 'Vendors',
            href: '/purchases/vendors',
            feature: 'vendors',
          },
          {
            title: 'Expenses',
            href: '/purchases/expenses',
            feature: 'expenses',
          },
        ],
      },
    ],
  },
  {
    label: '',
    items: [
      {
        title: 'Banking',
        href: '/banking',
        icon: CreditCard,
        color: 'var(--876-green)',
        permission: 'banking:read',
        feature: 'banking',
      },
      {
        title: 'Documents',
        href: '/documents',
        icon: StickyNote,
        color: 'var(--876-purple)',
        permission: 'billing:access',
        feature: 'documents',
      },
      {
        title: 'Payroll',
        href: '/payroll',
        icon: Users,
        color: 'var(--876-blue)',
        permission: 'billing:access',
        feature: 'payroll',
      },
    ],
  },
  {
    label: '',
    className: 'mt-auto',
    items: [
      {
        title: 'Reports',
        href: '/reports',
        icon: CreditCard,
        color: 'var(--876-green)',
        permission: 'reports:read',
      },
      {
        title: 'Settings',
        href: '/settings',
        icon: Settings,
        color: 'var(--876-blue)',
        permission: 'settings:read',
      },
    ],
  },
]

export function getVisibleNav(
  permissions: Permission[],
  productFeatures: BillingProductFeatures
): NavGroup[] {
  const allowed = new Set(permissions)

  return Nav.map((group) => ({
    ...group,
    items: group.items.flatMap((item) => {
      if (!allowed.has(item.permission)) return []
      if (item.feature && !productFeatures[item.feature]) return []
      if (!item.children) return [item]

      const children = item.children.filter(
        (child) =>
          (!child.feature || productFeatures[child.feature]) &&
          (!child.permission || allowed.has(child.permission))
      )
      if (children.length === 0) return []

      const hrefTargetsChild = item.children.some(
        (child) => child.href === item.href
      )

      return [
        {
          ...item,
          href: hrefTargetsChild ? children[0].href : item.href,
          children,
        },
      ]
    }),
  })).filter((group) => group.items.length > 0)
}

/** Console-style settings cards, filtered with Billing-local permissions. */
export const BILLING_SETTINGS_SECTIONS = [
  {
    title: 'Taxes & Currencies',
    description:
      'Manage transaction currencies, revenue authorities, and effective tax rates.',
    href: '/settings/compliance/currencies',
    icon: Globe2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    permissions: ['currencies:read', 'taxes:read'],
  },
  {
    title: 'Payment Modes',
    description:
      'Configure the cash, card, transfer, and custom methods accepted by this workspace.',
    href: '/settings/payment-modes',
    icon: CreditCard,
    iconColor: 'text-blue-600 dark:text-blue-400',
    permissions: ['payments:read'],
  },
  {
    title: 'Billing & Sales',
    description:
      'Configure invoice payment terms and the salespeople assigned to customers and invoices.',
    href: '/settings/billing',
    icon: ClipboardList,
    iconColor: 'text-orange-600 dark:text-orange-400',
    permissions: ['sales:read'],
  },
  {
    title: 'Subscription Billing',
    description:
      'Configure renewals, draft invoices, consolidation, calendar dates, pausing, and advance billing.',
    href: '/settings/subscriptions',
    icon: RefreshCw,
    iconColor: 'text-violet-600 dark:text-violet-400',
    permissions: ['subscriptions:read'],
  },
  {
    title: 'Discounts',
    description:
      'Create coupons and promotion codes for subscriptions, gifts, and customer offers.',
    href: '/settings/discounts',
    icon: StickyNote,
    iconColor: 'text-pink-600 dark:text-pink-400',
    permissions: ['subscriptions:read'],
  },
  {
    title: 'Payment Providers',
    description:
      'Prepare provider-agnostic connections for Caribbean and international payment processors.',
    href: '/settings/payment-providers',
    icon: CreditCard,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    permissions: ['payments:read'],
  },
  {
    title: 'Users',
    description: 'Assign workspace access and manage member status.',
    href: '/settings/users',
    icon: Users,
    iconColor: 'text-amber-600 dark:text-amber-400',
    permissions: ['members:read'],
  },
  {
    title: 'Roles & Permissions',
    description: 'Build least-privilege roles for Billing operations.',
    href: '/settings/roles',
    icon: KeyRound,
    iconColor: 'text-violet-600 dark:text-violet-400',
    permissions: ['roles:read'],
  },
] satisfies Array<{
  title: string
  description: string
  href: string
  icon: IconComponent
  iconColor: string
  permissions: Permission[]
}>

export function getVisibleSettingsSections(permissions: Permission[]) {
  const allowed = new Set(permissions)
  return BILLING_SETTINGS_SECTIONS.filter((section) =>
    section.permissions.some((permission) => allowed.has(permission))
  )
}
