import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import { createCoreSurface } from './base'
import type { BillingServerClientOptions } from '../internal/types'

export function createBillingClient(options: BillingServerClientOptions) {
  const services = createServiceClients(options)
  const billing = requireCapability(services.billing?.tenant, 'billing.tenant')
  const widgets = requireCapability(services.widgets?.member, 'widgets.member')
  const core = createCoreSurface({ platform: services.platform })
  return {
    ...core,
    customers: billing.customers,
    products: billing.products,
    plans: billing.plans,
    prices: billing.prices,
    priceLists: billing.priceLists,
    addons: billing.addons,
    discounts: billing.discounts,
    invoices: billing.invoices,
    invoicePreferences: billing.invoicePreferences,
    payments: billing.payments,
    paymentModes: billing.paymentModes,
    paymentProviders: billing.paymentProviders,
    paymentTerms: billing.paymentTerms,
    subscriptions: billing.subscriptions,
    taxRates: billing.taxRates,
    taxAuthorities: billing.taxAuthorities,
    bankAccounts: billing.bankAccounts,
    bankTransactions: billing.bankTransactions,
    salespeople: billing.salespeople,
    notes: widgets.notes,
    collections: widgets.collections,
  }
}

export type Billing876Client = ReturnType<typeof createBillingClient>
