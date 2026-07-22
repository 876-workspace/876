import type { MinorAmount } from './common'
import type { BankAccount } from './bank-account'
import type { BankTransaction } from './bank-transaction'
import type { PaymentMode } from './payment-mode'

/**
 * Parameters for allocating a payment to an invoice.
 */
export interface PaymentAllocationParams {
  /**
   * ID of the invoice to allocate against.
   */
  invoiceId: string

  /**
   * Amount to allocate in the smallest currency unit.
   */
  amount: MinorAmount
}

/**
 * Parameters for recording or replacing a received payment.
 */
export interface PaymentCreateParams {
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
   * Payment amount in the smallest currency unit.
   */
  amount: MinorAmount

  /**
   * Bank charges deducted from the payment, in the smallest currency unit.
   */
  bankCharges?: MinorAmount

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
  allocations?: PaymentAllocationParams[]
}

/**
 * Parameters for applying additional allocations to a payment.
 */
export interface PaymentApplyParams {
  /**
   * Invoice allocations to apply.
   */
  allocations: PaymentAllocationParams[]
}

/**
 * Parameters for replacing a received payment. Same shape as create.
 */
export interface PaymentUpdateParams extends PaymentCreateParams {}

/**
 * An allocation of a payment to a single invoice.
 */
export interface PaymentAllocation {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_allocation'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Allocated amount as a decimal string.
   */
  amount: string

  /**
   * The invoice this allocation applies to.
   */
  invoice: {
    /**
     * String representing the object's type. Objects of the same type share the same value.
     */
    object: 'invoice'

    /**
     * Unique identifier for the object.
     */
    id: string

    /**
     * The invoice number.
     */
    number: string

    /**
     * Total invoice amount as a decimal string.
     */
    totalAmount: string

    /**
     * Remaining amount due as a decimal string.
     */
    amountDue: string

    /**
     * Current status of the invoice.
     */
    status: string
  }

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
 * This object represents a payment received from a customer.
 */
export interface Payment {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment'

  /**
   * Unique identifier for the object.
   */
  id: string

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
  providerConnectionId?: string | null

  /**
   * Provider-side payment ID, if any.
   */
  providerPaymentId?: string | null

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
  customer: {
    /**
     * String representing the object's type. Objects of the same type share the same value.
     */
    object: 'customer'

    /**
     * Unique identifier for the object.
     */
    id: string

    /**
     * The customer's full name or business name.
     */
    name: string
  }

  /**
   * The payment mode used for the payment.
   */
  paymentMode: PaymentMode

  /**
   * The deposit account that received the payment.
   */
  depositAccount: Pick<
    BankAccount,
    'object' | 'id' | 'name' | 'accountType' | 'currency'
  >

  /**
   * Invoice allocations applied to this payment.
   */
  invoiceAllocations: PaymentAllocation[]

  /**
   * Linked bank transaction, if one was created.
   */
  bankTransaction?: BankTransaction | null

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
 * A minimal payment resource returned after creation.
 */
export interface PaymentCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted payment tombstone.
 */
export interface PaymentDeleted extends PaymentCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}
