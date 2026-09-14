import type { List } from '../../types'

/**
 * This object represents a payment mode exposed through the integration API.
 */
export interface BillingPaymentMode {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_mode'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The payment mode's display name.
   */
  name: string

  /**
   * Whether this is the tenant's default payment mode.
   */
  isDefault: boolean

  /**
   * Whether the payment mode is active for new payments.
   */
  isActive: boolean

  /**
   * Whether this payment mode is a system-managed default.
   */
  isSystem: boolean

  imageFileId: string | null

  imageUrl: string | null

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number
}

export interface BillingPaymentModeCreateParams {
  name: string
  isDefault?: boolean
}

export interface BillingPaymentModeUpdateParams {
  name?: string
  isDefault?: boolean
  isActive?: boolean
  imageFileId?: string | null
  imageUrl?: string | null
}

export interface BillingPaymentModeDeleted {
  object: 'payment_mode'
  id: string
  deleted: true
}

/**
 * A list of Billing payment modes.
 */
export type BillingPaymentModeList = List<BillingPaymentMode>
