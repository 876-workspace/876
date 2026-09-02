import { defineNavigation } from '@876/core/access'

/** Invoice navigation is resolved on the server before it crosses into the shell. */
export const navConfig = defineNavigation([
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
        requires: { permission: 'estimates.view' },
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
