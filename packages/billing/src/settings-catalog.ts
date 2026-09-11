import { FINANCE_MODULES } from '@876/core/modules'
import { defineModuleCatalog } from '@876/settings'

const SHARED_FINANCE_MODULE_CATALOG = defineModuleCatalog([
  {
    ...FINANCE_MODULES.invoices,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.quotes,
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'accepted-quote-conversion',
        label: 'Accepted quote conversion',
        type: 'enum',
        default: 'manual',
        hint: 'Choose whether accepting a quote only records the decision or also creates a draft invoice.',
        options: [
          { value: 'manual', label: 'Convert manually' },
          {
            value: 'draft-invoice-on-accept',
            label: 'Create a draft invoice on acceptance',
          },
        ],
      },
    ],
  },
  {
    ...FINANCE_MODULES.payments,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.expenses,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.items,
    optional: true,
    enabledByDefault: true,
    preferences: [
      {
        key: 'product-variants',
        label: 'Product variants',
        type: 'boolean',
        default: false,
        hint: 'Allow goods to have multiple sellable versions such as size or color.',
      },
    ],
  },
  {
    ...FINANCE_MODULES.salesReceipts,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.timeTracking,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.customers,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    key: 'crm',
    label: 'CRM',
    description:
      'Enable the future organization-owned CRM workspace inside finance apps.',
    optional: true,
    enabledByDefault: false,
    preferences: [],
  },
])

const BILLING_ONLY_MODULE_CATALOG = defineModuleCatalog([
  {
    ...FINANCE_MODULES.subscriptions,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.banking,
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
    ...FINANCE_MODULES.purchases,
    optional: true,
    enabledByDefault: true,
    preferences: [],
  },
  {
    ...FINANCE_MODULES.payroll,
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
  {
    ...FINANCE_MODULES.reports,
    optional: false,
    enabledByDefault: true,
    preferences: [
      {
        key: 'timezone',
        label: 'Reporting timezone',
        type: 'string',
        default: 'America/Jamaica',
        hint: 'IANA timezone used to bucket sales, cash, and receivables reports.',
      },
      {
        key: 'fiscal-year-start-month',
        label: 'Fiscal year start month',
        type: 'integer',
        default: 1,
        min: 1,
        max: 12,
        hint: 'Calendar month (1–12) the fiscal year starts in.',
      },
    ],
  },
])

export const INVOICE_MODULE_CATALOG = SHARED_FINANCE_MODULE_CATALOG

export const BILLING_MODULE_CATALOG = defineModuleCatalog([
  ...SHARED_FINANCE_MODULE_CATALOG,
  ...BILLING_ONLY_MODULE_CATALOG,
])
