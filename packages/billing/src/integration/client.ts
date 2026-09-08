import { createIntegrationBankAccountsResource } from './resources/bank-accounts'
import { createIntegrationCustomersResource } from './resources/customers'
import { createIntegrationInvoicesResource } from './resources/invoices'
import { createIntegrationItemsResource } from './resources/items'
import { createIntegrationQuotesResource } from './resources/quotes'
import { createIntegrationOrganizationsResource } from './resources/organizations'
import { createIntegrationPaymentModesResource } from './resources/payment-modes'
import { createIntegrationPaymentMethodsResource } from './resources/payment-methods'
import { createIntegrationPaymentIntentsResource } from './resources/payment-intents'
import { createIntegrationPaymentsResource } from './resources/payments'
import { createIntegrationRefundsResource } from './resources/refunds'
import { createIntegrationTaxAuthoritiesResource } from './resources/tax-authorities'
import { createIntegrationTaxRatesResource } from './resources/tax-rates'
import { buildIntegrationRuntime } from './runtime'
import type { IntegrationClientOptions } from './types'

/** Creates the official organization-scoped 876 Billing integration client. */
export function create876BillingIntegrationClient(
  options: IntegrationClientOptions = {}
) {
  const runtime = buildIntegrationRuntime(options)

  return {
    organizations: createIntegrationOrganizationsResource(runtime),
    bankAccounts: createIntegrationBankAccountsResource(runtime),
    customers: createIntegrationCustomersResource(runtime),
    items: createIntegrationItemsResource(runtime),
    invoices: createIntegrationInvoicesResource(runtime),
    quotes: createIntegrationQuotesResource(runtime),
    paymentModes: createIntegrationPaymentModesResource(runtime),
    paymentMethods: createIntegrationPaymentMethodsResource(runtime),
    paymentIntents: createIntegrationPaymentIntentsResource(runtime),
    payments: createIntegrationPaymentsResource(runtime),
    refunds: createIntegrationRefundsResource(runtime),
    taxAuthorities: createIntegrationTaxAuthoritiesResource(runtime),
    taxRates: createIntegrationTaxRatesResource(runtime),
  }
}

export type BillingIntegrationClient = ReturnType<
  typeof create876BillingIntegrationClient
>
