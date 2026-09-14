import type { AppModuleDefinition, AppModuleRegistry } from './types/modules'

export type {
  AppModuleDefinition,
  AppModuleKey,
  AppModuleRegistry,
} from './types/modules'

const KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

export function defineAppModuleRegistry<
  const TApp extends string,
  const TModules extends readonly AppModuleDefinition[],
>(input: { app: TApp; modules: TModules }): AppModuleRegistry<TApp, TModules> {
  const keys = new Set<string>()

  for (const definition of input.modules) {
    if (!KEY_PATTERN.test(definition.key))
      throw new Error(`Invalid module key: ${definition.key}`)
    if (keys.has(definition.key))
      throw new Error(`Duplicate module key: ${definition.key}`)
    if (!definition.label.trim())
      throw new Error(`Module ${definition.key} must have a label`)
    if (!definition.description.trim())
      throw new Error(`Module ${definition.key} must have a description`)

    keys.add(definition.key)
    Object.freeze(definition)
  }

  Object.freeze(input.modules)
  return Object.freeze(input)
}

/**
 * Cross-domain module identity shared by more than one product plane.
 *
 * These definitions name capabilities without moving their business ownership.
 * Requests remains CRM-owned even when Billing and Invoice project it as a
 * commercial application module.
 */
export const SHARED_APP_MODULES = {
  requests: {
    key: 'requests',
    label: 'Requests',
    description: 'Track and manage customer requests.',
  },
} as const satisfies Record<string, AppModuleDefinition>

/**
 * Finance module identity shared by two or more real architectural planes.
 *
 * Settings-only definitions remain at their product owner until another real
 * plane needs the same stable identity. Do not grow this object for speculative
 * future reuse.
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
  salesOrders: {
    key: 'sales-orders',
    label: 'Sales orders',
    description:
      'Manage customer order commitments before invoicing or operational fulfillment.',
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
  reports: {
    key: 'reports',
    label: 'Reports',
    description: 'Review sales, cash, receivables, and subscription reports.',
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
    SHARED_APP_MODULES.requests,
  ],
})

export const BILLING_MODULE_REGISTRY = defineAppModuleRegistry({
  app: '876-billing',
  modules: [
    ...INVOICE_MODULE_REGISTRY.modules,
    FINANCE_MODULES.salesOrders,
    FINANCE_MODULES.subscriptions,
    FINANCE_MODULES.banking,
    FINANCE_MODULES.purchases,
    FINANCE_MODULES.payroll,
  ],
})

/**
 * Modules that may be materialized into Core's commercial entitlement plane.
 *
 * Invoice currently has no competing aggregate commercial taxonomy, so its
 * implemented registry modules can be sold directly.
 *
 * Billing is intentionally narrower: only canonical definitions that exactly
 * match its existing effective commercial gates are materialized here. Sales
 * and documents remain explicit legacy aggregates in the plan seed; granular
 * Billing identities such as `invoices`, `quotes`, `payments`, `customers`, and
 * `sales-orders` must not appear as selectable Billing plan grants until runtime
 * entitlement enforcement is wired to those exact keys.
 *
 * Requests is deliberately present in both projections because this work wires
 * its exact app-scoped feature gate in both finance hosts.
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
  'requests',
] as const

export const BILLING_COMMERCIAL_MODULE_KEYS = [
  'subscriptions',
  'purchases',
  'banking',
  'payroll',
  'requests',
] as const

export const APP_MODULE_REGISTRIES = {
  '876-billing': BILLING_MODULE_REGISTRY,
  '876-invoice': INVOICE_MODULE_REGISTRY,
} as const

export type RegisteredModuleApp = keyof typeof APP_MODULE_REGISTRIES

export function getAppModuleRegistry(
  app: string
): AppModuleRegistry | undefined {
  if (!Object.hasOwn(APP_MODULE_REGISTRIES, app)) return undefined
  return APP_MODULE_REGISTRIES[app as RegisteredModuleApp]
}

export function findAppModule(
  app: string,
  key: string
): AppModuleDefinition | undefined {
  return getAppModuleRegistry(app)?.modules.find((module) => module.key === key)
}
