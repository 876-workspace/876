import 'server-only'

import { createAuthResource } from './resources/core/auth.ts'
import { createUsersResource } from './resources/core/users.ts'
import { createOrganizationsResource } from './resources/core/organizations.ts'
import { createAppsResource } from './resources/core/apps.ts'
import { createMembershipsResource } from './resources/core/memberships.ts'
import { createFeaturesResource } from './resources/core/features.ts'
import { createEntitlementsResource } from './resources/core/entitlements.ts'
import { createLocationsResource } from './resources/core/locations.ts'
import { createContactsResource } from './resources/core/contacts.ts'
import { createDepartmentsResource } from './resources/core/departments.ts'
import { createEmployeesResource } from './resources/core/employees.ts'
import { createRolesResource } from './resources/core/roles.ts'
import { createCustomersResource } from './resources/customers/customers.ts'
import { createProductsResource } from './resources/finance/products.ts'
import { createPlansResource } from './resources/finance/plans.ts'
import { createPricesResource } from './resources/finance/prices.ts'
import { createPriceListsResource } from './resources/finance/price-lists.ts'
import { createAddonsResource } from './resources/finance/addons.ts'
import { createDiscountsResource } from './resources/finance/discounts.ts'
import { createInvoicesResource } from './resources/finance/invoices.ts'
import { createInvoicePreferencesResource } from './resources/finance/invoice-preferences.ts'
import { createPaymentsResource } from './resources/finance/payments.ts'
import { createPaymentModesResource } from './resources/finance/payment-modes.ts'
import { createPaymentProvidersResource } from './resources/finance/payment-providers.ts'
import { createPaymentTermsResource } from './resources/finance/payment-terms.ts'
import { createSubscriptionsResource } from './resources/finance/subscriptions.ts'
import { createTaxRatesResource } from './resources/finance/tax-rates.ts'
import { createTaxAuthoritiesResource } from './resources/finance/tax-authorities.ts'
import { createBankAccountsResource } from './resources/finance/bank-accounts.ts'
import { createBankTransactionsResource } from './resources/finance/bank-transactions.ts'
import { createSalespeopleResource } from './resources/finance/salespeople.ts'
import { createItemsResource } from './resources/finance/items.ts'
import { createPackagesResource } from './resources/logistics/packages.ts'
import { createBranchesResource } from './resources/logistics/branches.ts'
import { createWarehousesResource } from './resources/logistics/warehouses.ts'
import { createMailboxesResource } from './resources/logistics/mailboxes.ts'
import { createAddressesResource } from './resources/logistics/addresses.ts'
import { createFilesResource } from './resources/storage/files.ts'
import { createUploadsResource } from './resources/storage/uploads.ts'
import { createNotesResource } from './resources/widgets/notes.ts'
import { createCollectionsResource } from './resources/widgets/collections.ts'
import { createServiceClients } from './internal/create-service-clients.ts'
import type { ServerClientOptions } from './internal/types.ts'

export function create876ServerClient(options: ServerClientOptions) {
  const services = createServiceClients(options)
  const { platform, platformAdmin, billing, couriers, storage, widgets } =
    services

  const couriersAdmin = couriers?.admin

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

    memberships: createMembershipsResource({
      platform,
      couriersAdmin,
    }),

    features: createFeaturesResource({
      platform,
      admin: platformAdmin,
    }),

    entitlements: createEntitlementsResource(platform),

    locations: createLocationsResource(platform),
    contacts: createContactsResource(platform),
    departments: createDepartmentsResource(platform),
    employees: createEmployeesResource(platform),

    roles: createRolesResource({
      platform,
      couriersAdmin,
    }),

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
    discounts: createDiscountsResource(billing?.tenant),
    invoices: createInvoicesResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    invoicePreferences: createInvoicePreferencesResource(billing?.tenant),
    payments: createPaymentsResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    paymentModes: createPaymentModesResource({
      tenant: billing?.tenant,
      integration: billing?.integration,
    }),
    paymentProviders: createPaymentProvidersResource(billing?.tenant),
    paymentTerms: createPaymentTermsResource(billing?.tenant),
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
    salespeople: createSalespeopleResource(billing?.tenant),

    packages: createPackagesResource(couriersAdmin),
    branches: createBranchesResource(couriersAdmin),
    warehouses: createWarehousesResource(couriersAdmin),
    mailboxes: createMailboxesResource(couriersAdmin),
    addresses: createAddressesResource(couriersAdmin),

    items: createItemsResource(billing?.integration),

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
