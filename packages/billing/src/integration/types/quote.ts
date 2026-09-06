import type { List } from '../../types'

/** A line used when creating a quote through the integration API. */
export interface BillingQuoteLineCreateParams {
  itemId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: string | null
  taxAmount?: string
  discountAmount?: string
}

/** Parameters for creating a quote through the integration API. */
export interface BillingQuoteCreateParams {
  customerId: string
  priceListId?: string | null
  currency?: string
  issueAt?: number
  expiresAt?: number
  notes?: string | null
  terms?: string | null
  lines: BillingQuoteLineCreateParams[]
}

/** A quote resource returned by the integration API. */
export type BillingQuote = {
  object: 'quote'
  id: string
} & Record<string, unknown>

/** Paginated quotes returned by the integration API. */
export type BillingQuoteList = List<BillingQuote>

/** Parameters for filtering integration quotes. */
export interface BillingQuoteListParams {
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CANCELED'
}
