import 'server-only'

import type { Customer } from '@876/billing'
import type {
  DocumentItemOption,
  DocumentTaxRateOption,
} from '@876/billing-ui/document/document-line-items-editor'
import { toDocumentTaxRateOptions } from '@876/billing-ui/document/document-tax-rate-options'

import { getBilling } from '@/lib/clients/billing'

import type { Invoice } from '@/lib/invoice'
import type { ClientResult } from '@/types/api'

export type DocumentCreateSearchParams = Promise<{
  customerId?: string | string[]
}>

export async function loadInitialDocumentCustomer(
  invoice: Invoice,
  searchParams: DocumentCreateSearchParams
): Promise<ClientResult<Customer | null>> {
  const customerId = (await searchParams).customerId
  if (typeof customerId !== 'string' || !customerId)
    return { data: null, error: null }

  const result = await invoice.customers.retrieve(customerId)
  if (result.error?.code === 'customer/not-found')
    return { data: null, error: null }
  if (result.error) return { data: null, error: result.error }
  if (result.data.status !== 'ACTIVE') return { data: null, error: null }

  return { data: result.data, error: null }
}

export async function loadDocumentItems(
  invoice: Invoice
): Promise<DocumentItemOption[]> {
  const result = await invoice.items.list({ active: true, limit: 20 })

  return result.data
    ? result.data.data.map((item) => ({
        value: `item:${item.id}`,
        label: item.name,
        itemId: item.id,
        priceId: null,
        defaultAmount: item.defaultSellingAmount,
        currency: item.defaultSellingCurrency,
        trackStock: item.trackStock,
        stockQuantity: item.stockQuantity,
        allowOutOfStock: item.allowOutOfStock,
      }))
    : []
}

/**
 * The organization's tax rates for the line Tax column. Read through the
 * signed-in member's Billing session, as the tax settings page does.
 */
export async function loadDocumentTaxRates(
  organizationId: string
): Promise<ClientResult<DocumentTaxRateOption[]>> {
  const billing = await getBilling(organizationId)
  const result = await billing.taxRates.list()
  if (result.error) return { data: null, error: result.error }

  return { data: toDocumentTaxRateOptions(result.data.data), error: null }
}
