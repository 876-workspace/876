import type { List } from '../../types'
import type { BillingSource } from './common'

export interface BillingPaymentAllocationCreateParams {
  invoiceId: string
  amount: number | string
}

export interface BillingPaymentCreateParams {
  customerId: string
  paymentModeId: string
  depositAccountId: string
  amount: number | string
  bankCharges?: number | string
  currency: string
  paymentDate: number
  referenceNumber?: string | null
  notes?: string | null
  allocations?: BillingPaymentAllocationCreateParams[]
  sourceExternalReference?: string | null
}

export interface BillingPayment {
  object: 'payment'
  id: string
  source: BillingSource | null
  number: string
  amount: string
  unappliedAmount: string
  amountRefunded: string
  status:
    | 'PENDING'
    | 'REQUIRES_ACTION'
    | 'AUTHORIZED'
    | 'PROCESSING'
    | 'SUCCEEDED'
    | 'FAILED'
    | 'CANCELED'
    | 'PARTIALLY_REFUNDED'
    | 'REFUNDED'
    | 'DISPUTED'
  providerConnectionId: string | null
  providerPaymentId: string | null
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  customer: { object: 'customer'; id: string; name: string }
  paymentMode: {
    object: 'payment_mode'
    id: string
    name: string
    isDefault: boolean
    isActive: boolean
    isSystem: boolean
    createdAt: number
    updatedAt: number
  }
  depositAccount: {
    object: 'bank_account'
    id: string
    name: string
    accountType: string
    currency: string
  }
  invoiceAllocations: Array<{
    object: 'payment_allocation'
    id: string
    amount: string
    createdAt: number
    updatedAt: number
    invoice: {
      object: 'invoice'
      id: string
      number: string
      totalAmount: string
      amountDue: string
      status: string
    }
  }>
  /** Refund evidence returned on detail reads. Lists may omit it. */
  refunds?: Array<{
    object: 'refund'
    id: string
    number: string
    amount: string
    currency: string
    reason: string | null
    refundedAt: number
    createdAt: number
  }>
  bankTransaction?: {
    object: 'bank_transaction'
    id: string
    accountId: string
    paymentId: string | null
    type: 'CREDIT' | 'DEBIT'
    amount: string
    date: number
    description: string | null
    status: string
    reference: string | null
    createdAt: number
    updatedAt: number
  } | null
  createdAt: number
  updatedAt: number
}

export type BillingPaymentList = List<BillingPayment>
