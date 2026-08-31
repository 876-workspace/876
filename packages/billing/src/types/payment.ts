import type { BankAccount } from './bank-account'
import type { BankTransaction } from './bank-transaction'
import type { MinorAmount } from './common'
import type { PaymentMode } from './payment-mode'

/** Statuses emitted by the Billing payment data model. */
export type PaymentStatus =
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

/** Parameters for allocating a payment to an invoice. */
export interface PaymentAllocationParams {
  invoiceId: string
  amount: MinorAmount
}

/** Parameters for recording or replacing a received payment. */
export interface PaymentCreateParams {
  customerId: string
  paymentModeId: string
  depositAccountId: string
  amount: MinorAmount
  bankCharges?: MinorAmount
  currency: string
  paymentDate: number
  referenceNumber?: string | null
  notes?: string | null
  allocations?: PaymentAllocationParams[]
}

/** Parameters for applying additional allocations to a payment. */
export interface PaymentApplyParams {
  allocations: PaymentAllocationParams[]
}

/** Parameters for replacing a received payment. Same shape as create. */
export interface PaymentUpdateParams extends PaymentCreateParams {}

/** An allocation of a payment to a single invoice. */
export interface PaymentAllocation {
  object: 'payment_allocation'
  id: string
  amount: string
  invoice: {
    object: 'invoice'
    id: string
    number: string
    totalAmount: string
    amountDue: string
    status: string
  }
  createdAt: number
  updatedAt: number
}

/** A payment received from a customer. */
export interface Payment {
  object: 'payment'
  id: string
  number: string
  amount: string
  unappliedAmount: string
  status: PaymentStatus
  providerConnectionId?: string | null
  providerPaymentId?: string | null
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  customer: {
    object: 'customer'
    id: string
    name: string
  }
  paymentMode: PaymentMode
  depositAccount: Pick<
    BankAccount,
    'object' | 'id' | 'name' | 'accountType' | 'currency'
  >
  invoiceAllocations: PaymentAllocation[]
  bankTransaction?: BankTransaction | null
  createdAt: number
  updatedAt: number
}

/** A minimal payment resource returned after creation. */
export interface PaymentCreated {
  object: 'payment'
  id: string
}

/** A deleted payment tombstone. */
export interface PaymentDeleted extends PaymentCreated {
  deleted: true
}
