import 'server-only'

import { create876AdminClient, type Admin876ClientOptions } from '@876/admin'
import { create876Client as createPlatformClient, type ClientOptions as PlatformClientOptions } from '@876/sdk'
import { create876Client as createBillingClient, type ClientOptions as BillingClientOptions } from '@876/billing'
import { create876AdminClient as createBillingAdminClient, type AdminClientOptions as BillingAdminClientOptions } from '@876/billing/admin'
import { create876BillingIntegrationClient, type IntegrationClientOptions as BillingIntegrationClientOptions } from '@876/billing/integration'
import { create876CouriersAdminClient, type AdminClientOptions as CouriersAdminClientOptions } from '@876/couriers/admin'
import { create876StorageClient, type StorageClientOptions } from '@876/storage'
import { createWidgetsClient, type CreateWidgetsClientOptions } from '@876/widgets/server'
import { createAuthResource } from './resources/auth.ts'
import { createUsersResource } from './resources/users.ts'
import { createOrganizationsResource } from './resources/organizations.ts'
import { createAppsResource } from './resources/apps.ts'
import { createMembershipsResource } from './resources/memberships.ts'
import { createFeaturesResource } from './resources/features.ts'
import { createEntitlementsResource } from './resources/entitlements.ts'
import { createLocationsResource } from './resources/locations.ts'
import { createContactsResource } from './resources/contacts.ts'
import { createDepartmentsResource } from './resources/departments.ts'
import { createEmployeesResource } from './resources/employees.ts'
import { createRolesResource } from './resources/roles.ts'
import { createCustomersResource } from './resources/customers.ts'
import { createProductsResource } from './resources/products.ts'
import { createPlansResource } from './resources/plans.ts'
import { createPricesResource } from './resources/prices.ts'
import { createPriceListsResource } from './resources/price-lists.ts'
import { createAddonsResource } from './resources/addons.ts'
import { createInvoicesResource } from './resources/invoices.ts'
import { createPaymentsResource } from './resources/payments.ts'
import { createSubscriptionsResource } from './resources/subscriptions.ts'
import { createTaxRatesResource } from './resources/tax-rates.ts'
import { createBankAccountsResource } from './resources/bank-accounts.ts'
import { createBankTransactionsResource } from './resources/bank-transactions.ts'
import { createPackagesResource } from './resources/packages.ts'
import { createBranchesResource } from './resources/branches.ts'
import { createWarehousesResource } from './resources/warehouses.ts'
import { createMailboxesResource } from './resources/mailboxes.ts'
import { createAddressesResource } from './resources/addresses.ts'
import { createCouriersRolesResource } from './resources/couriers-roles.ts'
import { createTeamResource } from './resources/team.ts'
import { createSettingsResource } from './resources/settings.ts'
import { createTenantsResource } from './resources/tenants.ts'
import { createItemsResource } from './resources/items.ts'
import { createStatsResource } from './resources/stats.ts'
import { createFilesResource } from './resources/files.ts'
import { createUploadsResource } from './resources/uploads.ts'
import { createNotesResource } from './resources/notes.ts'
import { createCollectionsResource } from './resources/collections.ts'
import type { AppId } from './context/types.ts'

export type ServerClientOptions = PlatformClientOptions & {
  app?: AppId
  internalKey?: string
  requestId?: string
  services?: {
    billing?: (BillingClientOptions | BillingIntegrationClientOptions) & { internalKey?: string; baseUrl?: string }
    couriers?: CouriersAdminClientOptions & { baseUrl?: string }
    storage?: StorageClientOptions
    widgets?: CreateWidgetsClientOptions
  }
  // legacy flat options for backwards compat during migration
  admin?: Admin876ClientOptions
  billing?: BillingIntegrationClientOptions
  couriersAdmin?: CouriersAdminClientOptions
  storage?: StorageClientOptions
  widgets?: CreateWidgetsClientOptions
}

export function create876ServerClient(options: ServerClientOptions = {}) {
  const {
    app = '876' as AppId,
    internalKey,
    requestId,
    services,
    admin: legacyAdmin,
    billing: legacyBilling,
    couriersAdmin: legacyCouriersAdmin,
    storage: legacyStorage,
    widgets: legacyWidgets,
    ...platformOptions
  } = options

  const platform = createPlatformClient(platformOptions as PlatformClientOptions)

  const adminOptions = legacyAdmin ?? (internalKey ? { internalKey, apiKey: platformOptions.apiKey, requestId } as Admin876ClientOptions : undefined)
  const platformAdmin = adminOptions ? create876AdminClient(adminOptions) : undefined

  const billingServices = services?.billing ?? legacyBilling as BillingIntegrationClientOptions | undefined
  const hasBillingInternalKey = Boolean((services?.billing as unknown as { internalKey?: string } | undefined)?.internalKey)
  const billingClient = billingServices && !hasBillingInternalKey ? createBillingClient(billingServices as BillingClientOptions) : undefined
  const billingIntegration = billingServices && hasBillingInternalKey ? create876BillingIntegrationClient(billingServices as BillingIntegrationClientOptions) : undefined
  const billingAdmin = (services?.billing as unknown as { internalKey?: string } | undefined)?.internalKey
    ? createBillingAdminClient({ internalKey: (services?.billing as unknown as { internalKey: string }).internalKey, requestId } as BillingAdminClientOptions)
    : undefined
  const billingForCustomers = (billingIntegration ?? billingClient) as unknown
  const billingForInvoices = (billingClient ?? billingIntegration) as unknown
  const billingForProducts = (billingAdmin ?? billingClient ?? billingIntegration) as unknown

  const couriersServices = services?.couriers ?? legacyCouriersAdmin as CouriersAdminClientOptions | undefined
  const couriersAdmin = couriersServices ? create876CouriersAdminClient(couriersServices as CouriersAdminClientOptions) : undefined

  const storageOptions = services?.storage ?? legacyStorage as StorageClientOptions | undefined
  const storage = storageOptions ? create876StorageClient(storageOptions) : undefined

  const widgetsOptions = services?.widgets ?? legacyWidgets as CreateWidgetsClientOptions | undefined
  const widgets = widgetsOptions ? createWidgetsClient(widgetsOptions) : undefined

  // choose billing impl: prefer integration if available, else tenant client
  const billing = (billingIntegration ?? billingClient) as unknown as Parameters<typeof createCustomersResource>[0]['billing']

  const adminSpread = (platformAdmin ?? {}) as Record<string, unknown>
  return {
    ...(adminSpread as object),
    auth: createAuthResource(platform),
    users: createUsersResource({ platform, admin: platformAdmin }) as unknown as any,
    organizations: createOrganizationsResource({ platform, admin: platformAdmin }) as unknown as any,
    memberships: (platformAdmin ? Object.assign({}, createMembershipsResource(platform), (platformAdmin as unknown as { memberships: any }).memberships, { admin: (platformAdmin as unknown as { memberships: any }).memberships }) as any : createMembershipsResource(platform) as any),
    apps: createAppsResource({ platform, admin: platformAdmin }) as unknown as any,
    features: (platformAdmin ? Object.assign({}, createFeaturesResource(platform), (platformAdmin as unknown as { features: any }).features, { admin: (platformAdmin as unknown as { features: any }).features }) as any : createFeaturesResource(platform) as any),
    entitlements: createEntitlementsResource(platform),
    locations: createLocationsResource(platform),
    contacts: createContactsResource(platform),
    departments: createDepartmentsResource(platform),
    employees: createEmployeesResource(platform),
    roles: createRolesResource(platform),
    organizationMembers: (platform as unknown as { organizationMembers: any }).organizationMembers,
    appAssignments: (platform as unknown as { appAssignments: any }).appAssignments,
    invites: (platform as unknown as { invites: any }).invites,
    auditEvents: (platformAdmin as unknown as { auditEvents?: unknown })?.auditEvents as unknown as any,
    appFeatures: (platformAdmin as unknown as { appFeatures?: unknown })?.appFeatures as unknown as any,
    appSubscriptions: (platformAdmin as unknown as { appSubscriptions?: unknown })?.appSubscriptions as unknown as any,
    organizationFeatures: (platformAdmin as unknown as { organizationFeatures?: unknown })?.organizationFeatures as unknown as any,
    messages: (platformAdmin as unknown as { messages?: unknown })?.messages as unknown as any,
    calls: (platformAdmin as unknown as { calls?: unknown })?.calls as unknown as any,
    phoneLookups: (platformAdmin as unknown as { phoneLookups?: unknown })?.phoneLookups as unknown as any,
    identifications: (platformAdmin as unknown as { identifications?: unknown })?.identifications as unknown as any,
    devices: (platformAdmin as unknown as { devices?: unknown })?.devices as unknown as any,
    sessions: (platformAdmin as unknown as { sessions?: unknown })?.sessions as unknown as any,
    authAttempts: (platformAdmin as unknown as { authAttempts?: unknown })?.authAttempts as unknown as any,
    apiKeys: (platformAdmin as unknown as { apiKeys?: unknown })?.apiKeys as unknown as any,
    modules: (platformAdmin as unknown as { modules?: unknown })?.modules as unknown as any,
    reservedUsernames: (platformAdmin as unknown as { reservedUsernames?: unknown })?.reservedUsernames as unknown as any,
    billingAccounts: (platformAdmin as unknown as { billingAccounts?: unknown })?.billingAccounts as unknown as any,
    provisioning: (platformAdmin as unknown as { provisioning?: unknown })?.provisioning as unknown as any,
    onboarding: (platformAdmin as unknown as { onboarding?: unknown })?.onboarding as unknown as any,
    permissions: (platform as unknown as { permissions: unknown }).permissions,
    organizationMembersAdmin: (platformAdmin as unknown as { organizationMembers?: unknown })?.organizationMembers,
    appAssignmentsAdmin: (platformAdmin as unknown as { appAssignments?: unknown })?.appAssignments,

    customers: createCustomersResource({ app, billing: billingForCustomers as never, billingAdmin: billingAdmin as never, couriersAdmin: couriersAdmin as never }) as unknown as any,
    products: createProductsResource(billingForProducts as never),
    plans: createPlansResource(billingForProducts as never),
    prices: createPricesResource(billingForProducts as never),
    priceLists: createPriceListsResource(billingForProducts as never),
    addons: createAddonsResource(billingForProducts as never),
    invoices: createInvoicesResource(billingForInvoices as never),
    payments: createPaymentsResource(billingForInvoices as never),
    subscriptions: createSubscriptionsResource(billingForInvoices as never),
    taxRates: createTaxRatesResource(billingForInvoices as never),
    taxAuthorities: undefined as unknown,
    bankAccounts: createBankAccountsResource(billingForProducts as never),
    bankTransactions: createBankTransactionsResource(billingForProducts as never),
    packages: createPackagesResource(couriersAdmin as never),
    branches: createBranchesResource(couriersAdmin as never),
    warehouses: createWarehousesResource(couriersAdmin as never),
    mailboxes: createMailboxesResource(couriersAdmin as never),
    addresses: createAddressesResource(couriersAdmin as never),
    couriersRoles: createCouriersRolesResource(couriersAdmin as never),
    team: createTeamResource(couriersAdmin as never),
    settings: createSettingsResource(couriersAdmin as never),
    tenants: createTenantsResource(couriersAdmin as never),
    items: createItemsResource(billingIntegration as never),
    stats: createStatsResource(billingAdmin as never),
    files: createFilesResource(storage as never),
    uploads: createUploadsResource(storage as never),
    notes: createNotesResource(widgets as never),
    collections: createCollectionsResource(widgets as never),
    oauth: (platform as unknown as { oauth: unknown }).oauth,
    productsCatalog: (platform as unknown as { products: unknown }).products,
  }
}

export type ServerClient876 = ReturnType<typeof create876ServerClient>
export type { Admin876ClientOptions, BillingIntegrationClientOptions, CouriersAdminClientOptions, CreateWidgetsClientOptions, PlatformClientOptions, StorageClientOptions }
