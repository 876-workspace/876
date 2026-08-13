import 'server-only'

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
import { createTaxAuthoritiesResource } from './resources/tax-authorities.ts'
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
import { createStatsResource } from './resources/stats.ts'
import { createItemsResource } from './resources/items.ts'
import { createFilesResource } from './resources/files.ts'
import { createUploadsResource } from './resources/uploads.ts'
import { createNotesResource } from './resources/notes.ts'
import { createCollectionsResource } from './resources/collections.ts'
import { createServiceClients } from './internal/create-service-clients.ts'
import type { ServerClientOptions } from './internal/types.ts'

/**
 * Composes the unified `$876.<resource>.<verb>()` surface for server
 * runtimes. Each resource is deliberately wired to the owning service tier
 * — no admin spread, no legacy options, no casted tier fallbacks.
 */
export function create876ServerClient(options: ServerClientOptions) {
  const services = createServiceClients(options)
  const { platform, platformAdmin, billing, couriers, storage, widgets } =
    services

  return {
    auth: createAuthResource(platform),

    users: createUsersResource({
      platform,
      admin: platformAdmin,
    }),

    organizations: createOrganizationsResource({
      platform,
      admin: platformAdmin,
    }),

    apps: createAppsResource({
      platform,
      admin: platformAdmin,
    }),

    memberships: createMembershipsResource(platform),

    features: createFeaturesResource({
      platform,
      admin: platformAdmin,
    }),

    entitlements: createEntitlementsResource(platform),

    locations: createLocationsResource(platform),
    contacts: createContactsResource(platform),
    departments: createDepartmentsResource(platform),
    employees: createEmployeesResource(platform),
    roles: createRolesResource(platform),

    customers: createCustomersResource({ app: options.app, services }),

    products: createProductsResource({
      tenant: billing?.tenant,
      admin: billing?.admin,
    }),
    plans: createPlansResource({
      tenant: billing?.tenant,
      admin: billing?.admin,
    }),
    prices: createPricesResource({
      tenant: billing?.tenant,
      admin: billing?.admin,
    }),
    priceLists: createPriceListsResource(billing?.tenant),
    addons: createAddonsResource(billing?.tenant),
    invoices: createInvoicesResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    payments: createPaymentsResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    subscriptions: createSubscriptionsResource({
      tenant: billing?.tenant,
      admin: billing?.admin,
    }),
    taxRates: createTaxRatesResource(billing?.tenant),
    taxAuthorities: createTaxAuthoritiesResource(billing?.tenant),
    bankAccounts: createBankAccountsResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    bankTransactions: createBankTransactionsResource(billing?.tenant),

    packages: createPackagesResource(couriers?.admin),
    branches: createBranchesResource(couriers?.admin),
    warehouses: createWarehousesResource(couriers?.admin),
    mailboxes: createMailboxesResource(couriers?.admin),
    addresses: createAddressesResource(couriers?.admin),
    couriersRoles: createCouriersRolesResource(couriers?.admin),
    team: createTeamResource(couriers?.admin),
    settings: createSettingsResource(couriers?.admin),
    tenants: createTenantsResource(couriers?.admin),

    items: createItemsResource(billing?.integration),
    stats: createStatsResource(billing?.admin),

    files: createFilesResource(storage),
    uploads: createUploadsResource(storage),

    notes: createNotesResource(widgets),
    collections: createCollectionsResource(widgets),

    oauth: platform.oauth,
    permissions: platform.permissions,
    organizationMembers: platform.organizationMembers,
    appAssignments: platform.appAssignments,
    invites: platform.invites,
  }
}

export type ServerClient876 = ReturnType<typeof create876ServerClient>
export type { Admin876ClientOptions } from '@876/admin'
export type { IntegrationClientOptions as BillingIntegrationClientOptions } from '@876/billing/integration'
export type { AdminClientOptions as CouriersAdminClientOptions } from '@876/couriers/admin'
export type { CreateWidgetsClientOptions } from '@876/widgets/server'
export type { StorageClientOptions } from '@876/storage'
export type { ServerClientOptions } from './internal/types.ts'
