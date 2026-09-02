import {
  defineNavigation,
  resolveNavigation,
  type AccessContext,
  type NavGroupDefinition,
} from '@876/core/access'
import {
  CircleStackIcon,
  ClipboardList,
  CreditCard,
  Globe2,
  KeyRound,
  RefreshCw,
  StickyNote,
  Users,
  type IconComponent,
} from '@876/ui/icons'
import type { Permission } from '@/types/access'

export const billingNavigation = defineNavigation([
  {
    key: 'workspace',
    entries: [
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'dashboard:read' },
      },
      {
        key: 'customers',
        title: 'Customers',
        href: '/customers',
        icon: 'customers',
        colorClassName: 'text-[var(--876-gold)]',
        requires: { permission: 'customers:read' },
      },
      {
        key: 'items',
        title: 'Items',
        href: '/items',
        icon: 'items',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'catalog:read' },
      },
      {
        key: 'sales',
        title: 'Sales',
        href: '/quotes',
        icon: 'sales',
        colorClassName: 'text-[var(--876-purple)]',
        requires: { permission: 'sales:read', feature: 'billing-sales' },
        children: [
          {
            key: 'sales-quotes',
            title: 'Quotes',
            href: '/quotes',
            icon: 'sales',
            requires: { feature: 'billing-sales-quotes' },
          },
          {
            key: 'sales-estimates',
            title: 'Estimates',
            href: '/estimates',
            icon: 'sales',
            requires: { feature: 'billing-sales-estimates' },
          },
          {
            key: 'sales-invoices',
            title: 'Invoices',
            href: '/invoices',
            icon: 'sales',
            requires: { feature: 'billing-sales-invoices' },
          },
          {
            key: 'sales-credit-notes',
            title: 'Credit Notes',
            href: '/credit-notes',
            icon: 'sales',
            requires: { feature: 'billing-sales-invoices' },
          },
          {
            key: 'sales-payments',
            title: 'Payments Received',
            href: '/payments',
            icon: 'sales',
            requires: { permission: 'payments:read' },
          },
        ],
      },
      {
        key: 'subscriptions',
        title: 'Subscriptions',
        href: '/subscriptions',
        icon: 'subscriptions',
        colorClassName: 'text-[var(--876-orange)]',
        requires: {
          permission: 'subscriptions:read',
          feature: 'billing-subscriptions',
        },
        children: [
          {
            key: 'subscriptions-products',
            title: 'Products',
            href: '/products',
            icon: 'subscriptions',
          },
          {
            key: 'subscriptions-plans',
            title: 'Plans',
            href: '/plans',
            icon: 'subscriptions',
          },
          {
            key: 'subscriptions-addons',
            title: 'Add-ons',
            href: '/addons',
            icon: 'subscriptions',
          },
          {
            key: 'subscriptions-prices',
            title: 'Prices',
            href: '/prices',
            icon: 'subscriptions',
          },
          {
            key: 'subscriptions-coupons',
            title: 'Coupons',
            href: '/coupons',
            icon: 'subscriptions',
          },
          {
            key: 'subscriptions-price-lists',
            title: 'Price Lists',
            href: '/price-lists',
            icon: 'subscriptions',
          },
        ],
      },
    ],
  },
  {
    key: 'purchases',
    entries: [
      {
        key: 'purchases',
        title: 'Purchases',
        href: '/purchases/vendors',
        icon: 'purchases',
        colorClassName: 'text-[var(--876-gold)]',
        requires: {
          permission: 'billing:access',
          feature: 'billing-purchases',
        },
        children: [
          {
            key: 'purchases-vendors',
            title: 'Vendors',
            href: '/purchases/vendors',
            icon: 'purchases',
            requires: { feature: 'billing-purchases-vendors' },
          },
          {
            key: 'purchases-expenses',
            title: 'Expenses',
            href: '/purchases/expenses',
            icon: 'purchases',
            requires: { feature: 'billing-purchases-expenses' },
          },
        ],
      },
    ],
  },
  {
    key: 'operations',
    entries: [
      {
        key: 'banking',
        title: 'Banking',
        href: '/banking',
        icon: 'banking',
        colorClassName: 'text-[var(--876-green)]',
        requires: {
          permission: 'banking:read',
          feature: 'billing-banking',
        },
      },
      {
        key: 'payroll',
        title: 'Payroll',
        href: '/payroll',
        icon: 'payroll',
        colorClassName: 'text-[var(--876-blue)]',
        requires: {
          permission: 'billing:access',
          feature: 'billing-payroll',
        },
      },
    ],
  },
  {
    key: 'secondary',
    entries: [
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        colorClassName: 'text-[var(--876-green)]',
        requires: { permission: 'reports:read' },
      },
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'settings:read' },
      },
    ],
  },
])

export function resolveBillingNavigation(
  context: AccessContext
): NavGroupDefinition[] {
  const resolved = resolveNavigation(billingNavigation, context)
  const declaredEntries = new Map(
    billingNavigation.flatMap((group) =>
      group.entries.map((entry) => [entry.key, entry])
    )
  )

  return resolved.map((group) => ({
    ...group,
    entries: group.entries.map((entry) => {
      const declared = declaredEntries.get(entry.key)
      const hrefTargetsDeclaredChild = declared?.children?.some(
        (child) => child.href === declared.href
      )

      if (!hrefTargetsDeclaredChild || !entry.children?.[0]) return entry

      return { ...entry, href: entry.children[0].href }
    }),
  }))
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
    title: 'Accounting Providers',
    description:
      'Connect Zoho Books and future accounting systems for external financial projection and reconciliation.',
    href: '/settings/accounting-providers',
    icon: CircleStackIcon,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    permissions: ['settings:read'],
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
