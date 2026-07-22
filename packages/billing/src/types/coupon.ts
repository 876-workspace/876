import type { MinorAmount } from './common'

/**
 * Parameters for creating a coupon.
 */
export interface CouponCreateParams {
  /**
   * The coupon's display name.
   */
  name: string

  /**
   * Optional promotion code created with the coupon.
   */
  code?: string | null

  /**
   * ID of the product this coupon is limited to, if any.
   */
  productId?: string | null

  /**
   * Percentage off when the coupon is percentage-based.
   */
  percentOff?: number | null

  /**
   * Amount off when the coupon is amount-based.
   */
  amountOff?: MinorAmount | null

  /**
   * Three-letter ISO currency code for amount-based coupons.
   */
  currency?: string | null

  /**
   * How long the coupon lasts. One of `ONCE`, `REPEATING`, or `FOREVER`.
   */
  duration: 'ONCE' | 'REPEATING' | 'FOREVER'

  /**
   * Number of cycles when `duration` is `REPEATING`.
   */
  durationInCycles?: number | null

  /**
   * Time after which the coupon can no longer be redeemed. Measured in seconds since the Unix epoch.
   */
  redeemBy?: number | null

  /**
   * Maximum number of times this coupon can be redeemed.
   */
  maxRedemptions?: number | null

  /**
   * Maximum number of times a single customer can redeem this coupon.
   */
  maxRedemptionsPerCustomer?: number | null

  /**
   * Where the discount is applied. One of `INVOICE_LEVEL` or `ITEM_LEVEL`.
   */
  discountPreference?: 'INVOICE_LEVEL' | 'ITEM_LEVEL'

  /**
   * Whether the coupon applies to all plans.
   */
  appliesToAllPlans?: boolean

  /**
   * Whether the coupon applies to all recurring addons.
   */
  appliesToAllRecurringAddons?: boolean

  /**
   * Whether the coupon applies to all one-time addons.
   */
  appliesToAllOneTimeAddons?: boolean

  /**
   * Whether every customer is eligible for this coupon.
   */
  eligibleForAllCustomers?: boolean

  /**
   * Plan IDs this coupon applies to when not all plans are eligible.
   */
  planIds?: string[]

  /**
   * Addon IDs this coupon applies to when not all addons are eligible.
   */
  addonIds?: string[]

  /**
   * Customer IDs eligible for this coupon when not all customers are eligible.
   */
  customerIds?: string[]

  /**
   * Per-currency amount-off values for multi-currency coupons.
   */
  currencyAmounts?: Array<{ currency: string; amountOff: MinorAmount }>
}

/**
 * Parameters for updating a coupon.
 */
export interface CouponUpdateParams {
  /**
   * The coupon's display name.
   */
  name?: string

  /**
   * Time after which the coupon can no longer be redeemed. Measured in seconds since the Unix epoch.
   */
  redeemBy?: number | null

  /**
   * Maximum number of times this coupon can be redeemed.
   */
  maxRedemptions?: number | null

  /**
   * Whether the coupon is active for new redemptions.
   */
  isActive?: boolean
}

/**
 * A minimal coupon resource returned after creation.
 */
export interface CouponCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'coupon'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * A deleted coupon tombstone.
 */
export interface CouponDeleted extends CouponCreated {
  /**
   * Always true for a deleted object.
   */
  deleted: true
}

/**
 * This object represents a coupon that can discount invoices or subscription items.
 */
export interface Coupon {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'coupon'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * The coupon's display name.
   */
  name: string

  /**
   * ID of the product this coupon is limited to, if any.
   */
  productId: string | null

  /**
   * Whether the coupon is percentage- or amount-based. One of `PERCENTAGE` or `AMOUNT`.
   */
  discountType: 'PERCENTAGE' | 'AMOUNT'

  /**
   * Percentage off as a decimal string.
   */
  percentOff: string | null

  /**
   * Amount off as a decimal string.
   */
  amountOff: string | null

  /**
   * Three-letter ISO currency code for amount-based coupons.
   */
  currency: string | null

  /**
   * How long the coupon lasts.
   */
  duration: CouponCreateParams['duration']

  /**
   * Number of cycles when `duration` is `REPEATING`.
   */
  durationInCycles: number | null

  /**
   * Time after which the coupon can no longer be redeemed. Measured in seconds since the Unix epoch.
   */
  redeemBy: number | null

  /**
   * Maximum number of times this coupon can be redeemed.
   */
  maxRedemptions: number | null

  /**
   * Maximum number of times a single customer can redeem this coupon.
   */
  maxRedemptionsPerCustomer: number | null

  /**
   * Where the discount is applied. One of `INVOICE_LEVEL` or `ITEM_LEVEL`.
   */
  discountPreference: 'INVOICE_LEVEL' | 'ITEM_LEVEL'

  /**
   * Whether the coupon applies to all plans.
   */
  appliesToAllPlans: boolean

  /**
   * Whether the coupon applies to all recurring addons.
   */
  appliesToAllRecurringAddons: boolean

  /**
   * Whether the coupon applies to all one-time addons.
   */
  appliesToAllOneTimeAddons: boolean

  /**
   * Whether every customer is eligible for this coupon.
   */
  eligibleForAllCustomers: boolean

  /**
   * Number of times this coupon has been redeemed.
   */
  timesRedeemed: number

  /**
   * Whether the coupon is active for new redemptions.
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
