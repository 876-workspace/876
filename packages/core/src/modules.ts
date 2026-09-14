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

export const SHARED_APP_MODULES = {
  requests: {
    key: 'requests',
    label: 'Requests',
    description: 'Track and manage customer requests.',
  },
} as const satisfies Record<string, AppModuleDefinition>

export const FINANCE_MODULES = {
  invoices: { key: 'invoices', label: 'Invoices', description: 'Create, issue, and manage customer invoices.' },
  quotes: { key: 'quotes', label: 'Quotes', description: 'Prepare customer quotes before converting approved work into invoices.' },
  salesOrders: { key: 'sales-orders', label: 'Sales orders', description: 'Manage customer order commitments before invoicing or operational fulfillment.' },
  payments: { key: 'payments', label: 'Payments', description: 'Record and reconcile customer payments against receivables.' },
  expenses: { key: 'expenses', label: 'Expenses', description: 'Track business expenses and supporting transaction details.' },
  items: { key: 'items', label: 'Items', description: 'Manage the products and services used on finance documents.' },
  salesReceipts: { key: 'sales-receipts', label: 'Sales receipts', description: 'Record paid sales where payment is collected at the time of sale.' },
  timeTracking: { key: 'time-tracking', label: 'Time tracking', description: 'Track billable and non-billable time for customer work.' },
  customers: { key: 'customers', label: 'Customers', description: 'Manage customer billing identities and finance relationships.' },
  subscriptions: { key: 'subscriptions', label: 'Subscriptions', description: 'Manage recurring customer billing and subscription lifecycles.' },
  banking: { key: 'banking', label: 'Banking', description: 'Track bank accounts and reconcile financial activity.' },
  purchases: { key: 'purchases', label: 'Purchases', description: 'Track vendor purchases and business spending.' },
  payroll: { key: 'payroll', label: 'Payroll', description: 'Manage payroll-related financial activity.' },
  reports: { key: 'reports', label: 'Reports', description: 'Review sales, cash, receivables, and subscription reports.' },
} as const satisfies Record<string, AppModuleDefinition>

export const PROJECTS_MODULES = {
  projects: { key: 'projects', label: 'Projects', description: 'Plan and manage projects and their work streams.' },
  issues: { key: 'issues', label: 'Issues', description: 'Track project issues, status, priority, and delivery work.' },
  reports: { key: 'reports', label: 'Reports', description: 'Review project delivery, throughput, and progress reporting.' },
} as const satisfies Record<string, AppModuleDefinition>

export const COMMERCE_MODULES = {
  catalog: { key: 'catalog', label: 'Catalog', description: 'Manage products, variants, collections, and merchandising.' },
  orders: { key: 'orders', label: 'Orders', description: 'Manage customer orders and their commerce lifecycle.' },
  customers: { key: 'customers', label: 'Customers', description: 'Manage commerce customer profiles and account relationships.' },
  inventory: { key: 'inventory', label: 'Inventory', description: 'Manage stock availability, locations, and inventory movement.' },
  storefront: { key: 'storefront', label: 'Storefront', description: 'Manage online stores, themes, content, navigation, and domains.' },
  checkout: { key: 'checkout', label: 'Checkout', description: 'Manage carts, checkout sessions, and checkout configuration.' },
  payments: { key: 'payments', label: 'Payments', description: 'Orchestrate commerce payment and transaction workflows.' },
  discounts: { key: 'discounts', label: 'Discounts', description: 'Manage discount codes, automatic discounts, and promotions.' },
  shipping: { key: 'shipping', label: 'Shipping', description: 'Configure shipping zones, rates, carriers, and delivery options.' },
  fulfillment: { key: 'fulfillment', label: 'Fulfillment', description: 'Manage picking, packing, shipment, and fulfillment lifecycle.' },
  returns: { key: 'returns', label: 'Returns', description: 'Manage returns, exchanges, return requests, and disposition.' },
  markets: { key: 'markets', label: 'Markets', description: 'Manage countries, currencies, localization, and regional selling.' },
  marketing: { key: 'marketing', label: 'Marketing', description: 'Manage commerce campaigns, acquisition, and promotion workflows.' },
  analytics: { key: 'analytics', label: 'Analytics', description: 'Review commerce performance, sales metrics, and reports.' },
  pos: { key: 'pos', label: 'POS', description: 'Manage physical retail and point-of-sale operations.' },
  b2b: { key: 'b2b', label: 'B2B', description: 'Manage companies, wholesale catalogs, terms, and B2B purchasing.' },
  subscriptions: { key: 'subscriptions', label: 'Subscriptions', description: 'Offer recurring commerce through the shared subscription engine.' },
  channels: { key: 'channels', label: 'Channels', description: 'Manage external sales channels and marketplace distribution.' },
  automation: { key: 'automation', label: 'Automation', description: 'Automate commerce workflows and event-driven operations.' },
} as const satisfies Record<string, AppModuleDefinition>

export const INVOICE_MODULE_REGISTRY = defineAppModuleRegistry({ app: '876-invoice', modules: [FINANCE_MODULES.invoices, FINANCE_MODULES.quotes, FINANCE_MODULES.payments, FINANCE_MODULES.expenses, FINANCE_MODULES.items, FINANCE_MODULES.salesReceipts, FINANCE_MODULES.timeTracking, FINANCE_MODULES.customers, SHARED_APP_MODULES.requests] })
export const BILLING_MODULE_REGISTRY = defineAppModuleRegistry({ app: '876-billing', modules: [...INVOICE_MODULE_REGISTRY.modules, FINANCE_MODULES.salesOrders, FINANCE_MODULES.subscriptions, FINANCE_MODULES.banking, FINANCE_MODULES.purchases, FINANCE_MODULES.payroll] })
export const PROJECTS_MODULE_REGISTRY = defineAppModuleRegistry({ app: '876-projects', modules: [PROJECTS_MODULES.projects, PROJECTS_MODULES.issues, PROJECTS_MODULES.reports] })
export const COMMERCE_MODULE_REGISTRY = defineAppModuleRegistry({ app: '876-commerce', modules: Object.values(COMMERCE_MODULES) })

export const INVOICE_COMMERCIAL_MODULE_KEYS = ['invoices','quotes','payments','expenses','items','sales-receipts','time-tracking','customers','requests'] as const
export const BILLING_COMMERCIAL_MODULE_KEYS = ['subscriptions','purchases','banking','payroll','requests'] as const
export const PROJECTS_COMMERCIAL_MODULE_KEYS = ['projects', 'issues'] as const
export const COMMERCE_COMMERCIAL_MODULE_KEYS = [] as const

export const APP_MODULE_REGISTRIES = {
  '876-billing': BILLING_MODULE_REGISTRY,
  '876-invoice': INVOICE_MODULE_REGISTRY,
  '876-projects': PROJECTS_MODULE_REGISTRY,
  '876-commerce': COMMERCE_MODULE_REGISTRY,
} as const

export type RegisteredModuleApp = keyof typeof APP_MODULE_REGISTRIES

export function getAppModuleRegistry(app: string): AppModuleRegistry | undefined {
  if (!Object.hasOwn(APP_MODULE_REGISTRIES, app)) return undefined
  return APP_MODULE_REGISTRIES[app as RegisteredModuleApp]
}

export function findAppModule(app: string, key: string): AppModuleDefinition | undefined {
  return getAppModuleRegistry(app)?.modules.find((module) => module.key === key)
}
