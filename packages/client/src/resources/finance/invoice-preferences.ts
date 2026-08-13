import type { Client as BillingClient } from '@876/billing'

export function createInvoicePreferencesResource(tenant?: BillingClient) {
  return tenant?.invoicePreferences
}
