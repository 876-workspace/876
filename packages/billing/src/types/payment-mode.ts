/**
 * Parameters for creating a tenant payment mode.
 */
export interface PaymentModeCreateParams {
  /**
   * The payment mode's display name.
   */
  name: string

  /**
   * Whether this payment mode should become the tenant default.
   */
  isDefault?: boolean
}

/**
 * Parameters for updating a payment mode.
 */
export interface PaymentModeUpdateParams {
  /**
   * The payment mode's display name.
   */
  name?: string

  /**
   * Whether this payment mode should become the tenant default.
   */
  isDefault?: boolean

  /**
   * Whether the payment mode is active for new payments.
   */
  isActive?: boolean
}

/**
 * This object represents a tenant payment mode (for example, cash, card, or bank transfer).
 */
export interface PaymentMode {
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
 * A minimal payment mode resource returned after creation.
 */
export interface PaymentModeCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'payment_mode'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted payment mode tombstone.
 */
export interface PaymentModeDeleted extends PaymentModeCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}
