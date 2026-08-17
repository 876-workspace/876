import { buildRuntime } from './runtime'
import { createBankAccountsResource } from './resources/bank-accounts'
import { createBankTransactionsResource } from './resources/bank-transactions'
import { createCatalogResources } from './resources/catalog'
import { createCustomersResource } from './resources/customers'
import {
  createPaymentTermsResource,
  createSalespeopleResource,
} from './resources/commercial'
import { createDiscountsResource } from './resources/discounts'
import { createItemsResource } from './resources/items'
import { createInvoicesResource } from './resources/invoices'
import { createInvoicePreferencesResource } from './resources/invoice-preferences'
import { createPaymentModesResource } from './resources/payment-modes'
import {
  createEstimatesResource,
  createQuotesResource,
} from './resources/quotes'
import { createPaymentsResource } from './resources/payments'
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
    discounts: createDiscountsResource(runtime),
    estimates: createEstimatesResource(runtime),
    invoices: createInvoicesResource(runtime),
    invoicePreferences: createInvoicePreferencesResource(runtime),
    items: createItemsResource(runtime),
    paymentModes: createPaymentModesResource(runtime),
    paymentProviders: createPaymentProvidersResource(runtime),
    paymentTerms: createPaymentTermsResource(runtime),
    payments: createPaymentsResource(runtime),
    plans: catalog.plans,
    prices: catalog.prices,
    priceLists: catalog.priceLists,
    products: catalog.products,
    quotes: createQuotesResource(runtime),
    salespeople: createSalespeopleResource(runtime),
    subscriptions: createSubscriptionsResource(runtime),
    taxAuthorities: createTaxAuthoritiesResource(runtime),
    taxRates: createTaxRatesResource(runtime),
  }
}

export type Client = ReturnType<typeof create876Client>
