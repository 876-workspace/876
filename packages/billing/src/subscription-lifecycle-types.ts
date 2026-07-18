import type {
  IntervalUnit,
  MinorAmount,
  SubscriptionItemCreateParams,
  TaxBehavior,
} from './types'

export type SubscriptionChangeTiming = 'IMMEDIATE' | 'END_OF_TERM' | 'SCHEDULED'
export type SubscriptionResumeBillingBehavior =
  | 'CONTINUE_EXISTING_PERIOD'
  | 'START_NEW_PERIOD'

export interface SubscriptionPauseParams {
  timing?: SubscriptionChangeTiming
  effectiveAt?: number | null
  resumeAt?: number | null
  pauseUnbilledBehavior?: 'RETAIN' | 'INVOICE_IMMEDIATELY'
  pauseCreditBehavior?: 'NONE' | 'PRORATE_CREDIT'
  resumeBillingBehavior?: SubscriptionResumeBillingBehavior
  reason?: string | null
}

export interface SubscriptionResumeParams {
  timing?: 'IMMEDIATE' | 'SCHEDULED'
  effectiveAt?: number | null
  resumeBillingBehavior?: SubscriptionResumeBillingBehavior
  reason?: string | null
}

export interface SubscriptionCancelParams {
  timing?: SubscriptionChangeTiming
  effectiveAt?: number | null
  reasonCode?: string | null
  reason?: string | null
  feedback?: string | null
}

export interface SubscriptionReactivateParams {
  startAt?: number
  reason?: string | null
}

export interface SubscriptionExtendParams {
  additionalCycles: number
  neverExpires?: boolean
  reason?: string | null
}

export interface SubscriptionAmendmentCreateParams {
  timing?: SubscriptionChangeTiming
  effectiveAt?: number | null
  prorationBehavior?: 'CREATE_PRORATIONS' | 'NONE' | 'ALWAYS_INVOICE'
  paymentFailureBehavior?: 'PREVENT_CHANGE' | 'APPLY_CHANGE'
  items: SubscriptionItemCreateParams[]
  collectionMethod?: 'SEND_INVOICE' | 'AUTO_CHARGE'
  billingTiming?: 'IN_ADVANCE' | 'IN_ARREARS'
  paymentTermId?: string | null
  taxBehavior?: TaxBehavior
  invoiceModeOverride?: 'AUTO_FINALIZE' | 'DRAFT' | null
  renewalPricingPolicy?:
    | 'RETAIN_EXISTING'
    | 'USE_LATEST'
    | 'MARKUP'
    | 'MARKDOWN'
  renewalAdjustmentPercent?: number | null
  billingCycleAnchor?: number | null
  remainingCycles?: number | null
  reason?: string | null
}

export interface SubscriptionChargeCreateParams {
  addonId?: string | null
  priceId?: string | null
  description: string
  quantity?: number
  unitAmount: MinorAmount
  currency: string
  taxBehavior?: TaxBehavior
  isTaxable?: boolean
  invoiceBehavior?: 'INVOICE_IMMEDIATELY' | 'NEXT_INVOICE'
  serviceAt?: number | null
}

export interface SubscriptionDiscountCreateParams {
  promotionCode?: string | null
  subscriptionItemId?: string | null
  scope?: 'TRANSACTION' | 'ITEM'
  discountType?: 'PERCENTAGE' | 'AMOUNT' | null
  percentOff?: number | null
  amountOff?: MinorAmount | null
  currency?: string | null
  duration?: 'ONCE' | 'FOREVER' | 'REPEATING'
  durationInCycles?: number | null
  startsAt?: number
  reason?: string | null
}

export interface SubscriptionMutationResult {
  object: 'subscription' | 'subscription_schedule' | 'subscription_amendment'
  id: string
  scheduled?: boolean
  applied?: boolean
  successor?: boolean
  deleted?: boolean
}

export interface SubscriptionChargeCreated {
  object: 'subscription_charge'
  id: string
  invoiceId: string | null
}

export interface SubscriptionDiscountCreated {
  object: 'subscription_discount'
  id: string
}

export interface SubscriptionChargeMutationResult {
  object: 'subscription_charge'
  id: string
  voided: boolean
}

export interface SubscriptionDiscountMutationResult {
  object: 'subscription_discount'
  id: string
  deleted: boolean
}

export interface SubscriptionPreferenceUpdateParams {
  defaultTaxBehavior: TaxBehavior
  defaultCollectionMethod: 'SEND_INVOICE' | 'AUTO_CHARGE'
  defaultBillingTiming: 'IN_ADVANCE' | 'IN_ARREARS'
  defaultProrationBehavior: 'CREATE_PRORATIONS' | 'ALWAYS_INVOICE' | 'NONE'
  defaultInvoiceMode: 'AUTO_FINALIZE' | 'DRAFT'
  notifyDraftInvoice: boolean
  consolidatedBillingEnabled: boolean
  calendarMode: 'ANNIVERSARY' | 'FIXED_DATES'
  calendarDays: number[]
  calendarMonths: number[]
  pauseResumeEnabled: boolean
  pauseUnbilledChargeBehavior: 'RETAIN' | 'INVOICE_IMMEDIATELY'
  pauseCreditBehavior: 'NONE' | 'PRORATE_CREDIT'
  defaultResumeBillingBehavior: 'CONTINUE_EXISTING_PERIOD' | 'START_NEW_PERIOD'
  defaultRenewalPricingPolicy:
    | 'RETAIN_EXISTING'
    | 'USE_LATEST'
    | 'MARKUP'
    | 'MARKDOWN'
  lockTrialAndFutureActivationPrice: boolean
  autoApplyCredits: boolean
  autoApplyExcessPayments: boolean
  advanceBillingEnabled: boolean
  advanceBillingMethod: 'INVOICE'
  automateAdvanceBilling: boolean
  advanceTermsFromPeriodStart: boolean
  notifyAdvanceBillingFailure: boolean
  advanceRules: Array<{ intervalUnit: IntervalUnit; daysBefore: number }>
}

export interface SubscriptionPreferences extends Omit<
  SubscriptionPreferenceUpdateParams,
  'calendarDays' | 'calendarMonths' | 'advanceRules'
> {
  object: 'subscription_preferences'
  tenantId: string
  createdAt: number
  updatedAt: number
  advanceRules: Array<{
    tenantId: string
    intervalUnit: IntervalUnit
    daysBefore: number
    createdAt: number
    updatedAt: number
  }>
  calendarDays: Array<{ tenantId: string; dayOfMonth: number }>
  calendarMonths: Array<{ tenantId: string; month: number }>
}

export interface SubscriptionPreferencesUpdated {
  object: 'subscription_preferences'
  tenantId: string
}

export interface SubscriptionBulkInvoiceModeParams {
  subscriptionIds: string[]
  invoiceModeOverride: 'AUTO_FINALIZE' | 'DRAFT' | null
}

export interface SubscriptionBulkUpdateResult {
  object: 'subscription_bulk_update'
  updated: number
}

export interface SubscriptionCustomViewRuleParams {
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
  operator:
    | 'EQUALS'
    | 'NOT_EQUALS'
    | 'CONTAINS'
    | 'IN'
    | 'BEFORE'
    | 'AFTER'
    | 'IS_EMPTY'
    | 'IS_NOT_EMPTY'
  value?: string | null
}

export interface SubscriptionCustomViewCreateParams {
  name: string
  visibility?: 'PRIVATE' | 'TENANT'
  isFavorite?: boolean
  sortField?: 'createdAt' | 'currentPeriodEnd' | 'status' | null
  sortDirection?: 'asc' | 'desc' | null
  rules: SubscriptionCustomViewRuleParams[]
  columns: Array<
    'customer' | 'offering' | 'amount' | 'status' | 'billingDate' | 'createdAt'
  >
}

export interface SubscriptionCustomView {
  object: 'subscription_view'
  id: string
  tenantId: string
  name: string
  ownerUserId: string | null
  visibility: 'PRIVATE' | 'TENANT'
  isFavorite: boolean
  sortField: string | null
  sortDirection: string | null
  createdAt: number
  updatedAt: number
  rules: Array<
    SubscriptionCustomViewRuleParams & {
      id: string
      viewId: string
      position: number
      value: string | null
    }
  >
  columns: Array<{
    id: string
    viewId: string
    position: number
    field: string
  }>
}

export interface SubscriptionViewMutationResult {
  object: 'subscription_view'
  id: string
  deleted?: boolean
}
