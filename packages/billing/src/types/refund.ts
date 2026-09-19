/**
 * Payment refunds.
 *
 * A refund returns money to a customer against exactly one source: either a
 * credit note or a payment. The Billing API serves list and create only;
 * refunds are immutable once issued, so there is no retrieve, update, or
 * delete route.
 */

import type { List, MinorAmount } from './common'

/**
 * This object represents a refund issued to a customer.
 */
export interface Refund {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'refund'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the customer who received the refund.
   */
  customerId: string

  /**
   * ID of the credit note this refund settles. Null when refunded against a payment.
   */
  creditNoteId: string | null

  /**
   * ID of the payment this refund returns. Null when refunded against a credit note.
   */
  paymentId: string | null

  /**
   * ID of the payment mode used for the refund. Null when none was recorded.
   */
  paymentModeId: string | null

  /**
   * ID of the deposit account the refund was paid from. Null when none was recorded.
   */
  depositAccountId: string | null

  /**
   * Human-readable refund number, for example `RFD-0001`.
   */
  number: string

  /**
   * Refunded amount in the currency's smallest unit, as an integer string.
   */
  amount: string

  /**
   * Three-letter ISO currency code for the refund.
   */
  currency: string

  /**
   * Reason for the refund. Null when none was given.
   */
  reason: string | null

  /**
   * Additional notes recorded with the refund. Null when none were given.
   */
  notes: string | null

  /**
   * Time at which the refund was issued. Measured in seconds since the Unix epoch.
   */
  refundedAt: number

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
 * A minimal refund resource returned after creation.
 */
export interface RefundCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'refund'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A list of refunds returned by the collection endpoint.
 */
export type RefundList = List<Refund>

/**
 * Parameters for creating a refund. Exactly one of `creditNoteId` or
 * `paymentId` must be provided.
 */
export interface RefundCreateParams {
  /**
   * ID of the customer receiving the refund.
   */
  customerId: string

  /**
   * Three-letter ISO currency code for the refund.
   */
  currency: string

  /**
   * Refunded amount in the currency's smallest unit. Must be greater than zero.
   */
  amount: MinorAmount

  /**
   * ID of the credit note this refund settles.
   */
  creditNoteId?: string

  /**
   * ID of the payment this refund returns.
   */
  paymentId?: string

  /**
   * ID of the payment mode used for the refund. Null clears it.
   */
  paymentModeId?: string | null

  /**
   * ID of the deposit account the refund is paid from. Null clears it.
   */
  depositAccountId?: string | null

  /**
   * Reason for the refund.
   */
  reason?: string | null

  /**
   * Additional notes recorded with the refund.
   */
  notes?: string | null

  /**
   * Time at which the refund was issued. Measured in seconds since the Unix epoch.
   */
  refundedAt: number
}
