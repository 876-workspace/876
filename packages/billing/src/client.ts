import { buildRuntime } from './runtime'
import { createBankAccountsResource } from './resources/bank-accounts'
import { createBankTransactionsResource } from './resources/bank-transactions'
import { createCatalogResources } from './resources/catalog'
import { createCustomersResource } from './resources/customers'
import { createCreditNotesResource } from './resources/credit-notes'
import { createCurrenciesResource } from './resources/currencies'
import {
  createPaymentTermsResource,
  createSalespeopleResource,
} from './resources/commercial'
import { createDiscountsResource } from './resources/discounts'
import { createItemsResource } from './resources/items'
import { createInvoicesResource } from './resources/invoices'
import { createInvoicePreferencesResource } from './resources/invoice-preferences'
import { createPaymentModesResource } from './resources/payment-modes'
import { createPaymentMethodsResource } from './resources/payment-methods'
import { createPaymentIntentsResource } from './resources/payment-intents'
import { createQuotesResource } from './resources/quotes'
import { createReportsResource } from './resources/reports'
import { createReportPreferencesResource } from './resources/report-preferences'
import { createSalesReceiptsResource } from './resources/sales-receipts'
import { createRecurringInvoicesResource } from './resources/recurring-invoices'
import { createMembersResource } from './resources/members'
import { createPaymentsResource } from './resources/payments'
import { createRolesResource } from './resources/roles'
import { createPaymentProvidersResource } from './resources/payment-providers'
import { createSubscriptionsResource } from './resources/subscriptions'
import { createTaxAuthoritiesResource } from './resources/tax-authorities'
import { createTaxRatesResource } from './resources/tax-rates'
import type { ClientOptions } from './types'

/** Creates a tenant-scoped 876 Billing client. */
export function create876Client(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  const catalog = createCatalogResources(runtime)

  return {
    bankAccounts: createBankAccountsResource(runtime),
    bankTransactions: createBankTransactionsResource(runtime),
    addons: catalog.addons,
    customers: createCustomersResource(runtime),
    creditNotes: createCreditNotesResource(runtime),
    currencies: createCurrenciesResource(runtime),
    discounts: createDiscountsResource(runtime),
    invoices: createInvoicesResource(runtime),
    invoicePreferences: createInvoicePreferencesResource(runtime),
    items: createItemsResource(runtime),
    members: createMembersResource(runtime),
    paymentModes: createPaymentModesResource(runtime),
    paymentMethods: createPaymentMethodsResource(runtime),
    paymentIntents: createPaymentIntentsResource(runtime),
    paymentProviders: createPaymentProvidersResource(runtime),
    paymentTerms: createPaymentTermsResource(runtime),
    payments: createPaymentsResource(runtime),
    plans: catalog.plans,
    prices: catalog.prices,
    priceLists: catalog.priceLists,
    products: catalog.products,
    quotes: createQuotesResource(runtime),
    reports: createReportsResource(runtime),
    reportPreferences: createReportPreferencesResource(runtime),
    roles: createRolesResource(runtime),
    salesReceipts: createSalesReceiptsResource(runtime),
    recurringInvoices: createRecurringInvoicesResource(runtime),
    salespeople: createSalespeopleResource(runtime),
    subscriptions: createSubscriptionsResource(runtime),
    taxAuthorities: createTaxAuthoritiesResource(runtime),
    taxRates: createTaxRatesResource(runtime),
  }
}

export type Client = ReturnType<typeof create876Client>
