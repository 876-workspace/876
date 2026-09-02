// The registry lives in @876/billing so Console can render the same navigation
// for an organization's workspace without copying it.
export {
  billingNavigation,
  resolveBillingNavigation,
} from '@876/billing/navigation'

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
