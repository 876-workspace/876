/**
 * Parameters for creating a promotion code.
 */
export interface PromotionCodeCreateParams {
  /**
   * ID of the coupon this promotion code redeems.
   */
  couponId: string

  /**
   * The customer-facing promotion code string.
   */
  code: string

  /**
   * ID of the customer this code is restricted to, if any.
   */
  customerId?: string | null

  /**
   * Time after which the code can no longer be redeemed. Measured in seconds since the Unix epoch.
   */
  expiresAt?: number | null

  /**
   * Maximum number of times this code can be redeemed.
   */
  maxRedemptions?: number | null
}

/**
 * This object represents a customer-facing promotion code that redeems a coupon.
 */
export interface PromotionCode {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'promotion_code'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the coupon this promotion code redeems.
   */
  couponId: string

  /**
   * The customer-facing promotion code string.
   */
  code: string

  /**
   * ID of the customer this code is restricted to, if any.
   */
  customerId: string | null

  /**
   * Time after which the code can no longer be redeemed. Measured in seconds since the Unix epoch.
   */
  expiresAt: number | null

  /**
   * Maximum number of times this code can be redeemed.
   */
  maxRedemptions: number | null

  /**
   * Number of times this code has been redeemed.
   */
  timesRedeemed: number

  /**
   * Whether the promotion code is active for new redemptions.
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
