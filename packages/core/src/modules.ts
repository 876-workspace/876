import type {
  AppModuleDefinition,
  AppModuleRegistry,
} from './types/modules'

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function defineAppModuleRegistry<
  const TApp extends string,
  const TModules extends readonly AppModuleDefinition[],
>(input: { app: TApp; modules: TModules }): AppModuleRegistry<TApp, TModules> {
  const keys = new Set<string>()

  for (const module of input.modules) {
    if (!KEY_PATTERN.test(module.key))
      throw new Error(`Invalid module key: ${module.key}`)
    if (keys.has(module.key))
      throw new Error(`Duplicate module key: ${module.key}`)
    if (!module.label.trim())
      throw new Error(`Module ${module.key} must have a label`)
    if (!module.description.trim())
      throw new Error(`Module ${module.key} must have a description`)

    keys.add(module.key)
    Object.freeze(module)
  }

  Object.freeze(input.modules)
  return Object.freeze(input)
}

/**
 * Canonical finance module identity.
 *
 * Settings, permissions, commercial entitlements, navigation and feature flags
 * project from these definitions when their semantics match. They do not copy
 * labels or descriptions into a second module taxonomy.
 */
export const FINANCE_MODULES = {
  invoices: {
    key: 'invoices',
    label: 'Invoices',
    description: 'Create, issue, and manage customer invoices.',
  },
  quotes: {
    key: 'quotes',
    label: 'Quotes',
    description:
      'Prepare customer quotes before converting approved work into invoices.',
  },
  payments: {
    key: 'payments',
    label: 'Payments',
    description: 'Record and reconcile customer payments against receivables.',
  },
  expenses: {
    key: 'expenses',
    label: 'Expenses',
    description: 'Track business expenses and supporting transaction details.',
  },
  items: {
    key: 'items',
    label: 'Items',
    description: 'Manage the products and services used on finance documents.',
  },
  salesReceipts: {
    key: 'sales-receipts',
    label: 'Sales receipts',
    description:
      'Record paid sales where payment is collected at the time of sale.',
  },
  timeTracking: {
    key: 'time-tracking',
    label: 'Time tracking',
    description: 'Track billable and non-billable time for customer work.',
  },
  customers: {
    key: 'customers',
    label: 'Customers',
    description:
      'Manage customer billing identities and finance relationships.',
  },
  crm: {
    key: 'crm',
    label: 'CRM',
    description:
      'Enable the future organization-owned CRM workspace inside finance apps.',
  },
  subscriptions: {
    key: 'subscriptions',
    label: 'Subscriptions',
    description:
      'Manage recurring customer billing and subscription lifecycles.',
  },
  banking: {
    key: 'banking',
    label: 'Banking',
    description: 'Track bank accounts and reconcile financial activity.',
  },
  creditNotes: {
    key: 'credit-notes',
    label: 'Credit notes',
    description:
      'Issue credits that reduce customer balances or invoice amounts.',
  },
  purchases: {
    key: 'purchases',
    label: 'Purchases',
    description: 'Track vendor purchases and business spending.',
  },
  payroll: {
    key: 'payroll',
    label: 'Payroll',
    description: 'Manage payroll-related financial activity.',
  },
  priceLists: {
    key: 'price-lists',
    label: 'Price lists',
    description:
      'Maintain alternate item pricing for customer and sales contexts.',
  },
  discounts: {
    key: 'discounts',
    label: 'Discounts',
    description: 'Configure discounts used across sales and recurring billing.',
  },
} as const satisfies Record<string, AppModuleDefinition>

export const INVOICE_MODULE_REGISTRY = defineAppModuleRegistry({
  app: '876-invoice',
  modules: [
    FINANCE_MODULES.invoices,
    FINANCE_MODULES.quotes,
    FINANCE_MODULES.payments,
    FINANCE_MODULES.expenses,
    FINANCE_MODULES.items,
    FINANCE_MODULES.salesReceipts,
    FINANCE_MODULES.timeTracking,
    FINANCE_MODULES.customers,
    FINANCE_MODULES.crm,
  ],
})

export const BILLING_MODULE_REGISTRY = defineAppModuleRegistry({
  app: '876-billing',
  modules: [
    ...INVOICE_MODULE_REGISTRY.modules,
    FINANCE_MODULES.subscriptions,
    FINANCE_MODULES.banking,
    FINANCE_MODULES.creditNotes,
    FINANCE_MODULES.purchases,
    FINANCE_MODULES.payroll,
    FINANCE_MODULES.priceLists,
    FINANCE_MODULES.discounts,
  ],
})

/**
 * Modules that may be materialized into Core's commercial entitlement plane.
 *
 * Invoice currently has no competing aggregate commercial taxonomy, so its
 * implemented functional modules can be sold directly. `crm` remains
 * settings-only until that product contract is implemented.
 *
 * Billing is intentionally narrower: only canonical definitions that exactly
 * match its existing effective commercial gates are materialized here. Sales
 * and documents remain explicit legacy aggregates in the plan seed; granular
 * Billing identities such as `invoices`, `quotes`, `payments`, `credit-notes`
 * and `price-lists` must not appear as selectable plan grants until runtime
 * entitlement enforcement is wired to those exact keys.
 */
export const INVOICE_COMMERCIAL_MODULE_KEYS = [
  'invoices',
  'quotes',
  'payments',
  'expenses',
  'items',
  'sales-receipts',
  'time-tracking',
  'customers',
] as const

export const BILLING_COMMERCIAL_MODULE_KEYS = [
  'subscriptions',
  'purchases',
  'banking',
  'payroll',
] as const

export const APP_MODULE_REGISTRIES = {
  '876-billing': BILLING_MODULE_REGISTRY,
  '876-invoice': INVOICE_MODULE_REGISTRY,
} as const

export type RegisteredModuleApp = keyof typeof APP_MODULE_REGISTRIES

export function getAppModuleRegistry(
  app: string
): AppModuleRegistry | undefined {
  if (!(app in APP_MODULE_REGISTRIES)) return undefined
  return APP_MODULE_REGISTRIES[app as RegisteredModuleApp]
}

export function findAppModule(
  app: string,
  key: string
): AppModuleDefinition | undefined {
  return getAppModuleRegistry(app)?.modules.find((module) => module.key === key)
}
