/**
 * Parameters for creating a payment term.
 */
export interface PaymentTermCreateParams {
  /**
   * The payment term's display name.
   */
  name: string

  /**
   * How the due date is calculated. One of `DUE_ON_RECEIPT`, `NET_DAYS`,
   * `END_OF_MONTH`, or `END_OF_NEXT_MONTH`.
   */
  rule: 'DUE_ON_RECEIPT' | 'NET_DAYS' | 'END_OF_MONTH' | 'END_OF_NEXT_MONTH'

  /**
   * Number of days used when `rule` is `NET_DAYS`.
   */
  dueDays?: number

  /**
   * Whether this payment term should become the tenant default.
   */
  isDefault?: boolean
}

/**
 * This object represents a payment term used to compute invoice due dates.
 */
export interface PaymentTerm {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_term'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The payment term's display name.
   */
  name: string

  /**
   * How the due date is calculated.
   */
  rule: PaymentTermCreateParams['rule']

  /**
   * Number of days used when `rule` is `NET_DAYS`.
   */
  dueDays: number

  /**
   * Whether this is the tenant's default payment term.
   */
  isDefault: boolean

  /**
   * Whether this payment term is a system-managed default.
   */
  isSystem: boolean

  /**
   * Whether the payment term is active for new invoices.
   */
  isActive: boolean

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}
