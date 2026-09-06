import { defineModuleCatalog } from '@876/settings'

const SHARED_FINANCE_MODULE_CATALOG = defineModuleCatalog([
  {
    key: 'invoices',
    label: 'Invoices',
    description: 'Create, issue, and manage customer invoices.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'quotes',
    label: 'Quotes',
    description:
      'Prepare customer quotes before converting approved work into invoices.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'payments',
    label: 'Payments',
    description: 'Record and reconcile customer payments against receivables.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Track business expenses and supporting transaction details.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'items',
    label: 'Items',
    description:
      'Manage the products and services used on finance documents.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'sales-receipts',
    label: 'Sales receipts',
    description:
      'Record paid sales where payment is collected at the time of sale.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'time-tracking',
    label: 'Time tracking',
    description: 'Track billable and non-billable time for customer work.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'customers',
    label: 'Customers',
    description: 'Manage customer billing identities and finance relationships.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
])

const BILLING_ONLY_MODULE_CATALOG = defineModuleCatalog([
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    description:
      'Manage recurring customer billing and subscription lifecycles.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'banking',
    label: 'Banking',
    description: 'Track bank accounts and reconcile financial activity.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'credit-notes',
    label: 'Credit notes',
    description:
      'Issue credits that reduce customer balances or invoice amounts.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    description: 'Track vendor purchases and business spending.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    description: 'Manage payroll-related financial activity.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'price-lists',
    label: 'Price lists',
    description:
      'Maintain alternate item pricing for customer and sales contexts.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'discounts',
    label: 'Discounts',
    description: 'Configure discounts used across sales and recurring billing.',
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
])

export const INVOICE_MODULE_CATALOG = SHARED_FINANCE_MODULE_CATALOG

export const BILLING_MODULE_CATALOG = defineModuleCatalog([
  ...SHARED_FINANCE_MODULE_CATALOG,
  ...BILLING_ONLY_MODULE_CATALOG,
])
