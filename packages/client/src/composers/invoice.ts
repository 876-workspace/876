import { createServiceClients } from '../internal/create-service-clients'
import type { InvoiceServerClientOptions } from '../internal/types'
import { requireCapability } from '../internal/require-capability'
import { createCoreSurface } from './base'

/**
 * 876 Invoice's client surface.
 *
 * Invoice is the entry-level product over the shared Billing data plane: it
 * gets the customer registry plus the invoicing chain (items → quotes /
 * estimates → invoices → payments) and its document preferences, and nothing else. The catalogue,
 * subscriptions, ledger, banking, and reporting resources stay behind 876
 * Billing — an organization that needs them upgrades, and finds every record
 * it already created here waiting for it.
 *
 * Each resource here has a matching finance scope on the `876-invoice`
 * provisioning manifest; widen both together or the API will refuse the call.
 */
export function createInvoiceClient(options: InvoiceServerClientOptions) {
  const services = createServiceClients(options)
  const billing = requireCapability(services.billing?.tenant, 'billing.tenant')
  const core = createCoreSurface({ platform: services.platform })

  return {
    ...core,
    customers: billing.customers,
    items: billing.products,
    quotes: billing.quotes,
    estimates: billing.estimates,
    invoices: billing.invoices,
    invoicePreferences: billing.invoicePreferences,
    payments: billing.payments,
    paymentTerms: billing.paymentTerms,
    taxRates: billing.taxRates,
  }
}

export type Invoice876Client = ReturnType<typeof createInvoiceClient>
