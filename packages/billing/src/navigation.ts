import {
  defineNavigation,
  resolveNavigation,
  type AccessContext,
  type NavEntry,
  type NavGroupDefinition,
} from '@876/core/access'

/**
 * The finance products' navigation registries.
 *
 * These live in the contract package rather than in each app because Console
 * renders the same navigation for an organization's workspace. A registry in
 * `apps/billing` would have to be copied to be reached, and a copied navigation
 * registry drifts from the app it claims to describe.
 *
 * Plain data only: string icon keys, no React components, because this crosses
 * the RSC boundary (`.claude/rules/access-control.md`).
 */

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
            key: 'sales-orders',
            title: 'Sales Orders',
            href: '/sales-orders',
            icon: 'sales',
            requires: { permission: 'sales-orders:read' },
          },
          {
            key: 'sales-invoices',
            title: 'Invoices',
            href: '/invoices',
            icon: 'sales',
            requires: { feature: 'billing-sales-invoices' },
          },
          {
            key: 'sales-recurring-invoices',
            title: 'Recurring Invoices',
            href: '/recurring-invoices',
            icon: 'sales',
            requires: { feature: 'billing-sales-invoices' },
          },
          {
            key: 'sales-receipts',
            title: 'Sales Receipts',
            href: '/sales-receipts',
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

/** 876 Invoice's navigation over the same finance plane. */
export const invoiceNavigation = defineNavigation([
  {
    key: 'workspace',
    entries: [
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'dashboard',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'dashboard.view' },
      },
      {
        key: 'customers',
        title: 'Customers',
        href: '/customers',
        icon: 'customers',
        colorClassName: 'text-[var(--876-gold)]',
        requires: { permission: 'customers.view' },
      },
      {
        key: 'items',
        title: 'Items',
        href: '/items',
        icon: 'items',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'items.view' },
      },
    ],
  },
  {
    key: 'sales',
    entries: [
      {
        key: 'quotes',
        title: 'Quotes',
        href: '/quotes',
        icon: 'quotes',
        colorClassName: 'text-[var(--876-purple)]',
        requires: { permission: 'quotes.view' },
      },
      {
        key: 'invoices',
        title: 'Invoices',
        href: '/invoices',
        icon: 'invoices',
        colorClassName: 'text-[var(--876-purple)]',
        requires: { permission: 'invoices.view' },
      },
      {
        key: 'recurring-invoices',
        title: 'Recurring Invoices',
        href: '/recurring-invoices',
        icon: 'recurring-invoices',
        colorClassName: 'text-[var(--876-purple)]',
        requires: { permission: 'invoices.view' },
      },
      {
        key: 'sales-receipts',
        title: 'Sales Receipt',
        href: '/sales-receipts',
        icon: 'sales-receipts',
        colorClassName: 'text-[var(--876-purple)]',
        requires: { permission: 'invoices.view' },
      },
      {
        key: 'payments',
        title: 'Payments Received',
        href: '/payments',
        icon: 'payments',
        colorClassName: 'text-[var(--876-green)]',
        requires: { permission: 'payments.view' },
      },
    ],
  },
  {
    key: 'expenses',
    entries: [
      {
        key: 'expenses',
        title: 'Expenses',
        href: '/expenses',
        icon: 'expenses',
        colorClassName: 'text-[var(--876-gold)]',
        requires: { permission: 'settings.view' },
      },
    ],
  },
  {
    key: 'secondary',
    entries: [
      {
        key: 'time-tracking',
        title: 'Time Tracking',
        href: '/time-tracking',
        icon: 'time-tracking',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'settings.view' },
      },
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        colorClassName: 'text-[var(--876-green)]',
        requires: { permission: 'reports.view' },
      },
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        colorClassName: 'text-[var(--876-blue)]',
        requires: { permission: 'settings.view' },
      },
    ],
  },
])

/**
 * Every permission key a registry references.
 *
 * Console projects an operator's access from this rather than a hand-written
 * grant list: an operator is a Console admin viewing the org's workspace, so
 * they hold the product's full privileges, and what actually varies per
 * organization is entitlement and feature rollout. Deriving the set means a
 * permission added to a registry cannot silently disappear from Console.
 */
export function navigationPermissionKeys(
  groups: readonly NavGroupDefinition[]
): string[] {
  const keys = new Set<string>()

  const walk = (entries: readonly NavEntry[]) => {
    for (const entry of entries) {
      if (entry.requires?.permission) keys.add(entry.requires.permission)
      for (const key of entry.requires?.anyPermission ?? []) keys.add(key)
      if (entry.children) walk(entry.children)
    }
  }

  for (const group of groups) walk(group.entries)

  return [...keys].sort()
}
