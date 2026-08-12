import { create876Client as createPlatformClient, type ClientOptions as PlatformClientOptions } from '@876/sdk'
import { create876Client as createBillingClient, type ClientOptions as BillingClientOptions } from '@876/billing'
import { create876CouriersClient, type ClientOptions as CouriersClientOptions } from '@876/couriers'
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
import { createTenantsResource } from './resources/tenants.ts'
import { createFilesResource } from './resources/files.ts'
import { createUploadsResource } from './resources/uploads.ts'
import { createNotesResource } from './resources/notes.ts'
import { createCollectionsResource } from './resources/collections.ts'
import type { AppId } from './context/types.ts'

export type ClientOptions = PlatformClientOptions & {
  app?: AppId
  billing?: BillingClientOptions
  couriers?: CouriersClientOptions
}

export function create876Client(options: ClientOptions = {}) {
  const { app = '876' as AppId, billing: billingOptions, couriers: couriersOptions, ...platformOptions } = options
  const platform = createPlatformClient(platformOptions)
  const billing = billingOptions ? createBillingClient(billingOptions) : undefined
  const couriersAdmin = couriersOptions ? create876CouriersClient(couriersOptions as never) as unknown as never : undefined

  const users = createUsersResource({ platform })
  const organizations = createOrganizationsResource({ platform })
  const apps = createAppsResource({ platform })

  return {
    auth: createAuthResource(platform),
    users,
    organizations,
    memberships: createMembershipsResource(platform),
    apps,
    features: createFeaturesResource(platform),
    entitlements: createEntitlementsResource(platform),
    locations: createLocationsResource(platform),
    contacts: createContactsResource(platform),
    departments: createDepartmentsResource(platform),
    employees: createEmployeesResource(platform),
    roles: createRolesResource(platform),
    organizationMembers: (platform as unknown as { organizationMembers: unknown }).organizationMembers,
    appAssignments: (platform as unknown as { appAssignments: unknown }).appAssignments,
    invites: (platform as unknown as { invites: unknown }).invites,
    customers: billing || couriersAdmin ? createCustomersResource({ app, billing: billing as never, couriersAdmin: couriersAdmin as never }) : undefined as unknown as ReturnType<typeof createCustomersResource>,
    products: createProductsResource(billing as never),
    plans: createPlansResource(billing as never),
    prices: createPricesResource(billing as never),
    priceLists: createPriceListsResource(billing as never),
    addons: createAddonsResource(billing as never),
    invoices: createInvoicesResource(billing as never),
    payments: createPaymentsResource(billing as never),
    subscriptions: createSubscriptionsResource(billing as never),
    taxRates: createTaxRatesResource(billing as never),
    taxAuthorities: undefined as unknown as ReturnType<typeof createCustomersResource>,
    bankAccounts: createBankAccountsResource(billing as never),
    bankTransactions: createBankTransactionsResource(billing as never),
    packages: couriersAdmin ? createPackagesResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createPackagesResource>,
    branches: couriersAdmin ? createBranchesResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createBranchesResource>,
    warehouses: couriersAdmin ? createWarehousesResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createWarehousesResource>,
    mailboxes: couriersAdmin ? createMailboxesResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createMailboxesResource>,
    addresses: couriersAdmin ? createAddressesResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createAddressesResource>,
    tenants: couriersAdmin ? createTenantsResource(couriersAdmin as never) : undefined as unknown as ReturnType<typeof createTenantsResource>,
    files: undefined as unknown as ReturnType<typeof createFilesResource>,
    uploads: undefined as unknown as ReturnType<typeof createUploadsResource>,
    notes: createNotesResource(undefined),
    collections: createCollectionsResource(undefined),
    oauth: (platform as unknown as { oauth: unknown }).oauth,
    productsCatalog: (platform as unknown as { products: unknown }).products,
  }
}

export type Client876 = ReturnType<typeof create876Client>
export type { BillingClientOptions, CouriersClientOptions, PlatformClientOptions }
