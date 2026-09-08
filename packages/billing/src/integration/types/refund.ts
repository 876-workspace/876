import type { List } from './common'

/** Parameters for returning integration-owned payment credit to a customer. */
export interface BillingRefundCreateParams {
  customerId: string
  currency: string
  amount: number | string
  paymentId: string
  paymentModeId?: string | null
  depositAccountId?: string | null
  reason?: string | null
  notes?: string | null
  refundedAt: number
}

/** Refund evidence exposed through the integration API. */
export interface BillingRefund {
  object: 'refund'
  id: string
  customerId: string
  creditNoteId: string | null
  paymentId: string | null
  paymentModeId: string | null
  depositAccountId: string | null
  number: string
  amount: string
  currency: string
  reason: string | null
  notes: string | null
  refundedAt: number
  createdAt: number
  updatedAt: number
}

/** Reference returned after a refund is recorded. */
export interface BillingRefundCreated {
  object: 'refund'
  id: string
}

export type BillingRefundList = List<BillingRefund>
