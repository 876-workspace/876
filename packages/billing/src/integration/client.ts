import { createIntegrationBankAccountsResource } from './resources/bank-accounts'
import { createIntegrationCustomersResource } from './resources/customers'
import { createIntegrationInvoicesResource } from './resources/invoices'
import { createIntegrationItemsResource } from './resources/items'
import { createIntegrationOrganizationsResource } from './resources/organizations'
import { createIntegrationPaymentModesResource } from './resources/payment-modes'
import { createIntegrationPaymentsResource } from './resources/payments'
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
    paymentModes: createIntegrationPaymentModesResource(runtime),
    payments: createIntegrationPaymentsResource(runtime),
  }
}

export type BillingIntegrationClient = ReturnType<
  typeof create876BillingIntegrationClient
>
