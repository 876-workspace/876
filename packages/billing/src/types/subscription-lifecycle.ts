import type {
  IntervalUnit,
  SubscriptionChangeTiming,
  SubscriptionResumeBillingBehavior,
  TaxBehavior,
} from './enums'
import type { MinorAmount } from './common'
import type { SubscriptionItemCreateParams } from './subscription'

/**
 * Parameters for pausing a subscription.
 */
export interface SubscriptionPauseParams {
  /**
   * When the pause takes effect. One of `IMMEDIATE`, `END_OF_TERM`, or `SCHEDULED`.
   */
  timing?: SubscriptionChangeTiming

  /**
   * Time at which a scheduled pause takes effect. Measured in seconds since the Unix epoch.
   */
  effectiveAt?: number | null

  /**
   * Time at which the subscription should resume. Measured in seconds since the Unix epoch.
   */
  resumeAt?: number | null

  /**
   * How unbilled charges are handled when pausing. One of `RETAIN` or `INVOICE_IMMEDIATELY`.
   */
  pauseUnbilledBehavior?: 'RETAIN' | 'INVOICE_IMMEDIATELY'

  /**
   * How credit is handled when pausing. One of `NONE` or `PRORATE_CREDIT`.
   */
  pauseCreditBehavior?: 'NONE' | 'PRORATE_CREDIT'

  /**
   * How billing resumes after the pause. One of `CONTINUE_EXISTING_PERIOD` or `START_NEW_PERIOD`.
   */
  resumeBillingBehavior?: SubscriptionResumeBillingBehavior

  /**
   * An arbitrary reason for the pause. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Parameters for resuming a paused subscription.
 */
export interface SubscriptionResumeParams {
  /**
   * When the resume takes effect. One of `IMMEDIATE` or `SCHEDULED`.
   */
  timing?: 'IMMEDIATE' | 'SCHEDULED'

  /**
   * Time at which a scheduled resume takes effect. Measured in seconds since the Unix epoch.
   */
  effectiveAt?: number | null

  /**
   * How billing resumes after the pause. One of `CONTINUE_EXISTING_PERIOD` or `START_NEW_PERIOD`.
   */
  resumeBillingBehavior?: SubscriptionResumeBillingBehavior

  /**
   * An arbitrary reason for the resume. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Parameters for canceling a subscription.
 */
export interface SubscriptionCancelParams {
  /**
   * When the cancellation takes effect. One of `IMMEDIATE`, `END_OF_TERM`, or `SCHEDULED`.
   */
  timing?: SubscriptionChangeTiming

  /**
   * Time at which a scheduled cancellation takes effect. Measured in seconds since the Unix epoch.
   */
  effectiveAt?: number | null

  /**
   * A machine-readable cancellation reason code.
   */
  reasonCode?: string | null

  /**
   * An arbitrary reason for the cancellation. Often useful for displaying to users.
   */
  reason?: string | null

  /**
   * Free-text feedback captured at cancellation time.
   */
  feedback?: string | null
}

/**
 * Parameters for reactivating a canceled subscription.
 */
export interface SubscriptionReactivateParams {
  /**
   * Time at which the reactivated subscription starts. Measured in seconds since the Unix epoch.
   */
  startAt?: number

  /**
   * An arbitrary reason for the reactivation. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Parameters for extending a finite subscription.
 */
export interface SubscriptionExtendParams {
  /**
   * Number of additional billing cycles to add.
   */
  additionalCycles: number

  /**
   * Whether the subscription should never expire after this extension.
   */
  neverExpires?: boolean

  /**
   * An arbitrary reason for the extension. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Parameters for creating a subscription amendment (plan or item change).
 */
export interface SubscriptionAmendmentCreateParams {
  /**
   * When the amendment takes effect. One of `IMMEDIATE`, `END_OF_TERM`, or `SCHEDULED`.
   */
  timing?: SubscriptionChangeTiming

  /**
   * Time at which a scheduled amendment takes effect. Measured in seconds since the Unix epoch.
   */
  effectiveAt?: number | null

  /**
   * How prorations are handled. One of `CREATE_PRORATIONS`, `NONE`, or `ALWAYS_INVOICE`.
   */
  prorationBehavior?: 'CREATE_PRORATIONS' | 'NONE' | 'ALWAYS_INVOICE'

  /**
   * How payment failures during the amendment are handled. One of `PREVENT_CHANGE` or `APPLY_CHANGE`.
   */
  paymentFailureBehavior?: 'PREVENT_CHANGE' | 'APPLY_CHANGE'

  /**
   * The subscription items after the amendment.
   */
  items: SubscriptionItemCreateParams[]

  /**
   * How invoices are collected after the amendment. One of `SEND_INVOICE` or `AUTO_CHARGE`.
   */
  collectionMethod?: 'SEND_INVOICE' | 'AUTO_CHARGE'

  /**
   * When recurring periods are billed. One of `IN_ADVANCE` or `IN_ARREARS`.
   */
  billingTiming?: 'IN_ADVANCE' | 'IN_ARREARS'

  /**
   * ID of the payment term applied after the amendment.
   */
  paymentTermId?: string | null

  /**
   * Tax behavior applied after the amendment. One of `EXCLUSIVE` or `INCLUSIVE`.
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
   * Billing cycle anchor after the amendment. Measured in seconds since the Unix epoch.
   */
  billingCycleAnchor?: number | null

  /**
   * Number of remaining billing cycles after the amendment.
   */
  remainingCycles?: number | null

  /**
   * An arbitrary reason for the amendment. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Parameters for adding a one-time charge to a subscription.
 */
export interface SubscriptionChargeCreateParams {
  /**
   * ID of the addon this charge is based on, if any.
   */
  addonId?: string | null

  /**
   * ID of the price this charge is based on, if any.
   */
  priceId?: string | null

  /**
   * An arbitrary description of the charge. Often useful for displaying to users.
   */
  description: string

  /**
   * Quantity of units for the charge.
   */
  quantity?: number

  /**
   * Unit amount in the smallest currency unit.
   */
  unitAmount: MinorAmount

  /**
   * Three-letter ISO currency code for the charge.
   */
  currency: string

  /**
   * Tax behavior applied to the charge. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  taxBehavior?: TaxBehavior

  /**
   * Whether the charge is taxable.
   */
  isTaxable?: boolean

  /**
   * When the charge is invoiced. One of `INVOICE_IMMEDIATELY` or `NEXT_INVOICE`.
   */
  invoiceBehavior?: 'INVOICE_IMMEDIATELY' | 'NEXT_INVOICE'

  /**
   * Service date for the charge. Measured in seconds since the Unix epoch.
   */
  serviceAt?: number | null
}

/**
 * Parameters for adding a discount to a subscription.
 */
export interface SubscriptionDiscountCreateParams {
  /**
   * Promotion code to redeem for this discount.
   */
  promotionCode?: string | null

  /**
   * ID of the subscription item the discount applies to, if any.
   */
  subscriptionItemId?: string | null

  /**
   * Scope of the discount. One of `TRANSACTION` or `ITEM`.
   */
  scope?: 'TRANSACTION' | 'ITEM'

  /**
   * Discount type. One of `PERCENTAGE` or `AMOUNT`.
   */
  discountType?: 'PERCENTAGE' | 'AMOUNT' | null

  /**
   * Percentage off when `discountType` is `PERCENTAGE`.
   */
  percentOff?: number | null

  /**
   * Amount off when `discountType` is `AMOUNT`.
   */
  amountOff?: MinorAmount | null

  /**
   * Three-letter ISO currency code for amount-based discounts.
   */
  currency?: string | null

  /**
   * How long the discount lasts. One of `ONCE`, `FOREVER`, or `REPEATING`.
   */
  duration?: 'ONCE' | 'FOREVER' | 'REPEATING'

  /**
   * Number of cycles when `duration` is `REPEATING`.
   */
  durationInCycles?: number | null

  /**
   * Time at which the discount starts. Measured in seconds since the Unix epoch.
   */
  startsAt?: number

  /**
   * An arbitrary reason for the discount. Often useful for displaying to users.
   */
  reason?: string | null
}

/**
 * Result of a subscription lifecycle mutation.
 */
export interface SubscriptionMutationResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription' | 'subscription_schedule' | 'subscription_amendment'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Whether the mutation was scheduled for a future time.
   */
  scheduled?: boolean

  /**
   * Whether the mutation was applied immediately.
   */
  applied?: boolean

  /**
   * Whether a successor subscription was created.
   */
  successor?: boolean

  /**
   * Always true for a deleted object.
   */
  deleted?: boolean
}

/**
 * A minimal subscription charge resource returned after creation.
 */
export interface SubscriptionChargeCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_charge'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the invoice created for the charge, if any.
   */
  invoiceId: string | null
}

/**
 * A minimal subscription discount resource returned after creation.
 */
export interface SubscriptionDiscountCreated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_discount'

  /**
   * Unique identifier for the object.
   */
  id: string
}

/**
 * Result of voiding a subscription charge.
 */
export interface SubscriptionChargeMutationResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_charge'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Whether the charge was voided.
   */
  voided: boolean
}

/**
 * Result of deleting a subscription discount.
 */
export interface SubscriptionDiscountMutationResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_discount'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Always true for a deleted object.
   */
  deleted: boolean
}

/**
 * Parameters for updating tenant subscription preferences.
 */
export interface SubscriptionPreferenceUpdateParams {
  /**
   * Default tax behavior for new subscriptions. One of `EXCLUSIVE` or `INCLUSIVE`.
   */
  defaultTaxBehavior: TaxBehavior

  /**
   * Default collection method. One of `SEND_INVOICE` or `AUTO_CHARGE`.
   */
  defaultCollectionMethod: 'SEND_INVOICE' | 'AUTO_CHARGE'

  /**
   * Default billing timing. One of `IN_ADVANCE` or `IN_ARREARS`.
   */
  defaultBillingTiming: 'IN_ADVANCE' | 'IN_ARREARS'

  /**
   * Default proration behavior. One of `CREATE_PRORATIONS`, `ALWAYS_INVOICE`, or `NONE`.
   */
  defaultProrationBehavior: 'CREATE_PRORATIONS' | 'ALWAYS_INVOICE' | 'NONE'

  /**
   * Default invoice mode. One of `AUTO_FINALIZE` or `DRAFT`.
   */
  defaultInvoiceMode: 'AUTO_FINALIZE' | 'DRAFT'

  /**
   * Whether to notify when a draft invoice is created.
   */
  notifyDraftInvoice: boolean

  /**
   * Whether consolidated billing is enabled.
   */
  consolidatedBillingEnabled: boolean

  /**
   * Calendar mode for billing periods. One of `ANNIVERSARY` or `FIXED_DATES`.
   */
  calendarMode: 'ANNIVERSARY' | 'FIXED_DATES'

  /**
   * Days of month used when `calendarMode` is `FIXED_DATES`.
   */
  calendarDays: number[]

  /**
   * Months used when `calendarMode` is `FIXED_DATES`.
   */
  calendarMonths: number[]

  /**
   * Whether pause and resume are enabled.
   */
  pauseResumeEnabled: boolean

  /**
   * How unbilled charges are handled when pausing. One of `RETAIN` or `INVOICE_IMMEDIATELY`.
   */
  pauseUnbilledChargeBehavior: 'RETAIN' | 'INVOICE_IMMEDIATELY'

  /**
   * How credit is handled when pausing. One of `NONE` or `PRORATE_CREDIT`.
   */
  pauseCreditBehavior: 'NONE' | 'PRORATE_CREDIT'

  /**
   * Default resume billing behavior. One of `CONTINUE_EXISTING_PERIOD` or `START_NEW_PERIOD`.
   */
  defaultResumeBillingBehavior: 'CONTINUE_EXISTING_PERIOD' | 'START_NEW_PERIOD'

  /**
   * Default renewal pricing policy. One of `RETAIN_EXISTING`, `USE_LATEST`, `MARKUP`, or `MARKDOWN`.
   */
  defaultRenewalPricingPolicy:
    | 'RETAIN_EXISTING'
    | 'USE_LATEST'
    | 'MARKUP'
    | 'MARKDOWN'

  /**
   * Whether trial and future activation prices are locked.
   */
  lockTrialAndFutureActivationPrice: boolean

  /**
   * Whether available credits are applied automatically.
   */
  autoApplyCredits: boolean

  /**
   * Whether excess payments are applied automatically.
   */
  autoApplyExcessPayments: boolean

  /**
   * Whether advance billing is enabled.
   */
  advanceBillingEnabled: boolean

  /**
   * Advance billing method. Always `INVOICE`.
   */
  advanceBillingMethod: 'INVOICE'

  /**
   * Whether advance billing runs automatically.
   */
  automateAdvanceBilling: boolean

  /**
   * Whether advance terms are calculated from period start.
   */
  advanceTermsFromPeriodStart: boolean

  /**
   * Whether to notify when advance billing fails.
   */
  notifyAdvanceBillingFailure: boolean

  /**
   * Advance billing rules by interval.
   */
  advanceRules: Array<{ intervalUnit: IntervalUnit; daysBefore: number }>
}

/**
 * Tenant defaults that control subscription behavior.
 */
export interface SubscriptionPreferences extends Omit<
  SubscriptionPreferenceUpdateParams,
  'calendarDays' | 'calendarMonths' | 'advanceRules'
> {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_preferences'

  /**
   * ID of the tenant that owns these preferences.
   */
  tenantId: string

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number

  /**
   * Advance billing rules with timestamps.
   */
  advanceRules: Array<{
    tenantId: string
    intervalUnit: IntervalUnit
    daysBefore: number
    createdAt: number
    updatedAt: number
  }>

  /**
   * Fixed calendar days configured for the tenant.
   */
  calendarDays: Array<{ tenantId: string; dayOfMonth: number }>

  /**
   * Fixed calendar months configured for the tenant.
   */
  calendarMonths: Array<{ tenantId: string; month: number }>
}

/**
 * A confirmation returned after updating subscription preferences.
 */
export interface SubscriptionPreferencesUpdated {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_preferences'

  /**
   * ID of the tenant that owns the updated preferences.
   */
  tenantId: string
}

/**
 * Parameters for bulk-updating invoice mode on subscriptions.
 */
export interface SubscriptionBulkInvoiceModeParams {
  /**
   * IDs of the subscriptions to update.
   */
  subscriptionIds: string[]

  /**
   * Override for how invoices are finalized. One of `AUTO_FINALIZE` or `DRAFT`.
   */
  invoiceModeOverride: 'AUTO_FINALIZE' | 'DRAFT' | null
}

/**
 * Result of a bulk subscription update.
 */
export interface SubscriptionBulkUpdateResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_bulk_update'

  /**
   * Number of subscriptions updated.
   */
  updated: number
}

/**
 * A filter rule for a subscription custom view.
 */
export interface SubscriptionCustomViewRuleParams {
  /**
   * Field to filter on.
   */
  field:
    | 'status'
    | 'customerId'
    | 'customerName'
    | 'currency'
    | 'collectionMethod'
    | 'billingTiming'
    | 'taxBehavior'
    | 'createdAt'
    | 'currentPeriodEnd'

  /**
   * Comparison operator.
   */
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'IN'
    | 'BEFORE'
    | 'AFTER'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'

  /**
   * Value to compare against, when the operator requires one.
   */
  value?: string | null
}

/**
 * Parameters for creating a subscription custom view.
 */
export interface SubscriptionCustomViewCreateParams {
  /**
   * The view's display name.
   */
  name: string

  /**
   * Who can see the view. One of `PRIVATE` or `TENANT`.
   */
  visibility?: 'PRIVATE' | 'TENANT'

  /**
   * Whether the view is marked as a favorite.
   */
  isFavorite?: boolean

  /**
   * Field used for sorting.
   */
  sortField?: 'createdAt' | 'currentPeriodEnd' | 'status' | null

  /**
   * Sort direction. One of `asc` or `desc`.
   */
  sortDirection?: 'asc' | 'desc' | null

  /**
   * Filter rules for the view.
   */
  rules: SubscriptionCustomViewRuleParams[]

  /**
   * Columns shown in the view.
   */
  columns: Array<
    'customer' | 'offering' | 'amount' | 'status' | 'billingDate' | 'createdAt'
  >
}

/**
 * A saved subscription list view with filters and columns.
 */
export interface SubscriptionCustomView {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_view'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * ID of the tenant that owns the view.
   */
  tenantId: string

  /**
   * The view's display name.
   */
  name: string

  /**
   * ID of the user who owns a private view.
   */
  ownerUserId: string | null

  /**
   * Who can see the view. One of `PRIVATE` or `TENANT`.
   */
  visibility: 'PRIVATE' | 'TENANT'

  /**
   * Whether the view is marked as a favorite.
   */
  isFavorite: boolean

  /**
   * Field used for sorting.
   */
  sortField: string | null

  /**
   * Sort direction.
   */
  sortDirection: string | null

  /**
   * Time at which the object was created. Measured in seconds since the Unix epoch.
   */
  createdAt: number

  /**
   * Time at which the object was last updated. Measured in seconds since the Unix epoch.
   */
  updatedAt: number

  /**
   * Filter rules for the view.
   */
  rules: Array<
    SubscriptionCustomViewRuleParams & {
      id: string
      viewId: string
      position: number
      value: string | null
    }
  >

  /**
   * Columns shown in the view.
   */
  columns: Array<{
    id: string
    viewId: string
    position: number
    field: string
  }>
}

/**
 * Result of creating or deleting a subscription custom view.
 */
export interface SubscriptionViewMutationResult {
  /**
   * String representing the object's type. Objects of the same type share the same value.
   */
  object: 'subscription_view'

  /**
   * Unique identifier for the object.
   */
  id: string

  /**
   * Always true for a deleted object.
   */
  deleted?: boolean
}
