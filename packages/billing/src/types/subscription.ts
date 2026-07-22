import type { SubscriptionStatus, TaxBehavior } from './enums'

/**
 * A recurring price attached to a new subscription.
 */
export interface SubscriptionItemCreateParams {
  /**
   * ID of the price to attach.
   */
  priceId: string

  /**
   * Quantity of the price to bill for.
   */
  quantity?: number
}

/**
 * Parameters for creating a tenant-owned commercial subscription.
 */
export interface SubscriptionCreateParams {
  /**
   * ID of the customer who owns the subscription.
   */
  customerId: string

  /**
   * The subscription items to bill for.
   */
  items: SubscriptionItemCreateParams[]

  /**
   * Initial status of the subscription.
   */
  status?: SubscriptionStatus

  /**
   * Time at which the subscription starts. Measured in seconds since the Unix epoch.
   */
  startAt?: number

  /**
   * ID of the source app that created the subscription, if any.
   */
  sourceAppId?: string | null

  /**
   * An external reference you can use to match this subscription in another system.
   */
  externalReference?: string | null

  /**
   * Billing cycle anchor. Measured in seconds since the Unix epoch.
   */
  billingCycleAnchor?: number

  /**
   * How invoices for this subscription are collected. One of `SEND_INVOICE` or `AUTO_CHARGE`.
   */
  collectionMethod?: 'SEND_INVOICE' | 'AUTO_CHARGE'

  /**
   * When recurring periods are billed. One of `IN_ADVANCE` or `IN_ARREARS`.
   */
  billingTiming?: 'IN_ADVANCE' | 'IN_ARREARS'

  /**
   * How prorations are handled. One of `CREATE_PRORATIONS`, `NONE`, or `ALWAYS_INVOICE`.
   */
  prorationBehavior?: 'CREATE_PRORATIONS' | 'NONE' | 'ALWAYS_INVOICE'

  /**
   * ID of the payment term applied to generated invoices.
   */
  paymentTermId?: string | null

  /**
   * Whether available credits should be applied automatically.
   */
  autoApplyCredits?: boolean

  /**
   * Tax behavior applied to subscription invoices. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  taxBehavior?: TaxBehavior

  /**
   * Override for how invoices are finalized. One of `AUTO_FINALIZE` or `DRAFT`.
   */
  invoiceModeOverride?: 'AUTO_FINALIZE' | 'DRAFT' | null

  /**
   * How renewal pricing is selected. One of `RETAIN_EXISTING`, `USE_LATEST`, `MARKUP`, or `MARKDOWN`.
   */
  renewalPricingPolicy?:
    | 'RETAIN_EXISTING'
    | 'USE_LATEST'
    | 'MARKUP'
    | 'MARKDOWN'

  /**
   * Percentage used when `renewalPricingPolicy` is `MARKUP` or `MARKDOWN`.
   */
  renewalAdjustmentPercent?: number | null

  /**
   * Whether activation prices are locked for trial and future activation.
   */
  lockActivationPrices?: boolean

  /**
   * Number of remaining billing cycles, if the subscription is finite.
   */
  remainingCycles?: number | null

  /**
   * ID of the price list used when resolving catalog prices.
   */
  priceListId?: string | null

  /**
   * Whether advance billing is enabled for this subscription.
   */
  advanceBillingEnabled?: boolean | null

  /**
   * Number of days before period start to create advance invoices.
   */
  advanceBillingDays?: number | null

  /**
   * Promotion code to apply when creating the subscription.
   */
  promotionCode?: string | null
}

/**
 * A minimal subscription resource returned after creation.
 */
export interface SubscriptionCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * Parameters for previewing a subscription item change.
 */
export interface SubscriptionProrationPreviewParams {
  /**
   * Time at which the change takes effect. Measured in seconds since the Unix epoch.
   */
  changeAt: number

  /**
   * The subscription items after the change.
   */
  items: SubscriptionItemCreateParams[]
}

/**
 * Parameters for creating a manual invoice on a subscription.
 */
export interface SubscriptionManualInvoiceParams {
  /**
   * Whether to create an advance invoice.
   */
  advance?: boolean

  /**
   * Whether the invoice should remain a draft.
   */
  draft?: boolean
}

/**
 * A single line on an upcoming invoice preview.
 */
export interface UpcomingInvoiceLine {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'upcoming_invoice_line'

  /**
   * Whether the line is recurring or one-time. One of `RECURRING` or `ONE_TIME`.
   */
  kind: 'RECURRING' | 'ONE_TIME'

  /**
   * ID of the subscription item this line belongs to, if any.
   */
  subscriptionItemId: string | null

  /**
   * ID of the subscription charge this line belongs to, if any.
   */
  subscriptionChargeId: string | null

  /**
   * ID of the price this line references, if any.
   */
  priceId: string | null

  /**
   * An arbitrary description of the line. Often useful for displaying to users.
   */
  description: string

  /**
   * Quantity of units for the line.
   */
  quantity: number

  /**
   * Unit amount as a decimal string.
   */
  unitAmount: string

  /**
   * Discount amount as a decimal string.
   */
  discountAmount: string

  /**
   * Tax amount as a decimal string.
   */
  taxAmount: string

  /**
   * Total amount as a decimal string.
   */
  totalAmount: string
}

/**
 * A preview of the next invoice for a subscription.
 */
export interface UpcomingInvoice {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'upcoming_invoice'

  /**
   * ID of the subscription being previewed.
   */
  subscriptionId: string

  /**
   * The customer who owns the subscription.
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
   * Three-letter ISO currency code for the invoice.
   */
  currency: string

  /**
   * Time at which the invoice is scheduled. Measured in seconds since the Unix epoch.
   */
  scheduledFor: number | null

  /**
   * Start of the service period. Measured in seconds since the Unix epoch.
   */
  servicePeriodStart: number | null

  /**
   * End of the service period. Measured in seconds since the Unix epoch.
   */
  servicePeriodEnd: number | null

  /**
   * Subtotal amount as a decimal string.
   */
  subtotalAmount: string

  /**
   * Discount amount as a decimal string.
   */
  discountAmount: string

  /**
   * Tax amount as a decimal string.
   */
  taxAmount: string

  /**
   * Total amount as a decimal string.
   */
  totalAmount: string

  /**
   * Line items included in the preview.
   */
  lines: UpcomingInvoiceLine[]
}

/**
 * A preview of proration amounts for a subscription change.
 */
export interface ProrationPreview {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'proration_preview'

  /**
   * An error message when the preview could not be calculated.
   */
  error: string | null

  /**
   * ID of the subscription being previewed.
   */
  subscriptionId?: string

  /**
   * Three-letter ISO currency code for the preview amounts.
   */
  currency?: string

  /**
   * Time at which the change takes effect. Measured in seconds since the Unix epoch.
   */
  changeAt?: number

  /**
   * Start of the billing period. Measured in seconds since the Unix epoch.
   */
  periodStart?: number

  /**
   * End of the billing period. Measured in seconds since the Unix epoch.
   */
  periodEnd?: number

  /**
   * Amount for the old period as a decimal string.
   */
  oldPeriodAmount?: string

  /**
   * Amount for the new period as a decimal string.
   */
  newPeriodAmount?: string

  /**
   * Unused credit as a decimal string.
   */
  unusedCredit?: string

  /**
   * Remaining charge as a decimal string.
   */
  remainingCharge?: string

  /**
   * Net amount due as a decimal string.
   */
  netAmount?: string

  /**
   * How the adjustment is settled. One of `INVOICE`, `CREDIT_NOTE`, or `NONE`.
   */
  adjustment?: 'INVOICE' | 'CREDIT_NOTE' | 'NONE'
}
