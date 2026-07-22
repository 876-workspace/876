import type { List } from '../../types'
import type { BillingSource } from './common'

/**
 * Parameters for allocating a payment to an invoice.
 */
export interface BillingPaymentAllocationCreateParams {
  /**
   * ID of the invoice to allocate against.
   */
  invoiceId: string

  /**
   * Amount to allocate in the smallest currency unit or as a decimal string.
   */
  amount: number | string
}

/**
 * Parameters for recording a payment through the integration API.
 */
export interface BillingPaymentCreateParams {
  /**
   * ID of the customer who made the payment.
   */
  customerId: string

  /**
   * ID of the payment mode used for the payment.
   */
  paymentModeId: string

  /**
   * ID of the bank account where the payment is deposited.
   */
  depositAccountId: string

  /**
   * Payment amount in the smallest currency unit or as a decimal string.
   */
  amount: number | string

  /**
   * Bank charges deducted from the payment.
   */
  bankCharges?: number | string

  /**
   * Three-letter ISO currency code for the payment.
   */
  currency: string

  /**
   * Time at which the payment was received. Measured in seconds since the Unix epoch.
   */
  paymentDate: number

  /**
   * An arbitrary reference number for the payment.
   */
  referenceNumber?: string | null

  /**
   * An arbitrary note attached to the payment. Often useful for displaying to users.
   */
  notes?: string | null

  /**
   * Invoice allocations to apply when recording the payment.
   */
  allocations?: BillingPaymentAllocationCreateParams[]

  /**
   * External reference for the product app that created the payment.
   */
  sourceExternalReference?: string | null
}

/**
 * This object represents a payment exposed through the integration API.
 */
export interface BillingPayment {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Source metadata from the product app that created the payment, if any.
   */
  source: BillingSource | null

  /**
   * The payment number.
   */
  number: string

  /**
   * Payment amount as a decimal string.
   */
  amount: string

  /**
   * Unapplied amount remaining as a decimal string.
   */
  unappliedAmount: string

  /**
   * Status of the payment. One of `PENDING`, `SUCCEEDED`, `FAILED`, or `CANCELED`.
   */
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'

  /**
   * ID of the payment provider connection used for the payment, if any.
   */
  providerConnectionId: string | null

  /**
   * Provider-side payment ID, if any.
   */
  providerPaymentId: string | null

  /**
   * Bank charges as a decimal string.
   */
  bankCharges: string

  /**
   * Three-letter ISO currency code for the payment.
   */
  currency: string

  /**
   * Time at which the payment was received. Measured in seconds since the Unix epoch.
   */
  paymentDate: number

  /**
   * An arbitrary reference number for the payment.
   */
  referenceNumber: string | null

  /**
   * An arbitrary note attached to the payment. Often useful for displaying to users.
   */
  notes: string | null

  /**
   * The customer who made the payment.
   */
  customer: { object: 'customer'; id: string; name: string }

  /**
   * The payment mode used for the payment.
   */
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

  /**
   * The deposit account that received the payment.
   */
  depositAccount: {
    object: 'bank_account'
    id: string
    name: string
    accountType: string
    currency: string
  }

  /**
   * Invoice allocations applied to this payment.
   */
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

  /**
   * Linked bank transaction, if one was created.
   */
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

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

/**
 * A list of Billing payments.
 */
export type BillingPaymentList = List<BillingPayment>
