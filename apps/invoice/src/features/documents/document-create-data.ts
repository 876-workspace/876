import 'server-only'

import type { Customer } from '@876/billing'
import type { DocumentItemOption } from '@876/billing-ui/document/document-line-items-editor'

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
