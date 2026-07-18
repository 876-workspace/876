import { z } from 'zod'

import {
  IdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'
import { TaxBehaviorSchema } from './invoice-preference'
import { minorAmountSchema } from './currency'

export const SubscriptionStatusSchema = z.enum([
  'DRAFT',
  'TRIALING',
  'ACTIVE',
  'PAUSED',
  'CANCELED',
  'ENDED',
])

export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>

export const CollectionMethodSchema = z.enum(['SEND_INVOICE', 'AUTO_CHARGE'])
export const BillingTimingSchema = z.enum(['IN_ADVANCE', 'IN_ARREARS'])
export const ProrationBehaviorSchema = z.enum([
  'CREATE_PRORATIONS',
  'NONE',
  'ALWAYS_INVOICE',
])
export const SubscriptionInvoiceModeSchema = z.enum(['AUTO_FINALIZE', 'DRAFT'])
export const RenewalPricingPolicySchema = z.enum([
  'RETAIN_EXISTING',
  'USE_LATEST',
  'MARKUP',
  'MARKDOWN',
])
export const SubscriptionChangeTimingSchema = z.enum([
  'IMMEDIATE',
  'END_OF_TERM',
  'SCHEDULED',
])
export const SubscriptionPaymentFailureBehaviorSchema = z.enum([
  'PREVENT_CHANGE',
  'APPLY_CHANGE',
])
export const ResumeBillingBehaviorSchema = z.enum([
  'CONTINUE_EXISTING_PERIOD',
  'START_NEW_PERIOD',
])
export const PauseUnbilledChargeBehaviorSchema = z.enum([
  'RETAIN',
  'INVOICE_IMMEDIATELY',
])
export const PauseCreditBehaviorSchema = z.enum(['NONE', 'PRORATE_CREDIT'])

export interface SubscriptionListParams {
  status?: SubscriptionStatus
  customerId?: string
  customViewId?: string
}

/** Serialized row consumed by Billing subscription tables. */
export interface SubscriptionTableRow {
  id: string
  externalReference: string | null
  customer: {
    id: string
    name: string
    type: 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'
  }
  offering: {
    productName: string
    planName: string | null
    additionalItems: number
  }
  amount: string | null
  currency: string | null
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | null
  intervalCount: number | null
  status: SubscriptionStatus
  nextBillingAt: number | null
  createdAt: number
}

export const SubscriptionItemCreateSchema = z.strictObject({
  priceId: IdSchema,
  quantity: z.number().int().min(1).max(1_000_000).default(1),
})

export const SubscriptionCreateSchema = z
  .strictObject({
    customerId: IdSchema,
    items: z.array(SubscriptionItemCreateSchema).min(1).max(100),
    status: SubscriptionStatusSchema.default('DRAFT'),
    startAt: unixTimestampSchema.optional(),
    sourceAppId: IdSchema.nullable().optional(),
    externalReference: IdSchema.nullable().optional(),
    billingCycleAnchor: unixTimestampSchema.optional(),
    collectionMethod: CollectionMethodSchema.default('SEND_INVOICE'),
    billingTiming: BillingTimingSchema.default('IN_ADVANCE'),
    prorationBehavior: ProrationBehaviorSchema.default('CREATE_PRORATIONS'),
    paymentTermId: IdSchema.nullable().optional(),
    autoApplyCredits: z.boolean().default(true),
    taxBehavior: TaxBehaviorSchema.optional(),
    invoiceModeOverride: SubscriptionInvoiceModeSchema.nullable().optional(),
    renewalPricingPolicy: RenewalPricingPolicySchema.optional(),
    renewalAdjustmentPercent: z.number().min(0).max(1000).nullable().optional(),
    lockActivationPrices: z.boolean().optional(),
    remainingCycles: z.number().int().min(1).max(100_000).nullable().optional(),
    priceListId: IdSchema.nullable().optional(),
    advanceBillingEnabled: z.boolean().nullable().optional(),
    advanceBillingDays: z.number().int().min(1).max(3650).nullable().optional(),
    promotionCode: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.renewalPricingPolicy === 'MARKUP' ||
        value.renewalPricingPolicy === 'MARKDOWN') &&
      (!value.renewalAdjustmentPercent || value.renewalAdjustmentPercent <= 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a renewal adjustment percentage greater than zero.',
        path: ['renewalAdjustmentPercent'],
      })
    if (value.advanceBillingEnabled && !value.advanceBillingDays)
      context.addIssue({
        code: 'custom',
        message: 'Enter how many days before renewal to bill.',
        path: ['advanceBillingDays'],
      })
  })

export type SubscriptionCreateParams = z.infer<typeof SubscriptionCreateSchema>
export type SubscriptionCreateInput = z.input<typeof SubscriptionCreateSchema>

export const SubscriptionManualInvoiceSchema = z.strictObject({
  advance: z.boolean().default(false),
  draft: z.boolean().default(false),
})

export type SubscriptionManualInvoiceParams = z.input<
  typeof SubscriptionManualInvoiceSchema
>
export type SubscriptionCreateServiceParams = Omit<
  SubscriptionCreateParams,
  | 'collectionMethod'
  | 'billingTiming'
  | 'prorationBehavior'
  | 'autoApplyCredits'
> &
  Partial<
    Pick<
      SubscriptionCreateParams,
      | 'collectionMethod'
      | 'billingTiming'
      | 'prorationBehavior'
      | 'autoApplyCredits'
    >
  >

export interface SubscriptionCreated {
  object: 'subscription'
  id: string
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

export interface SubscriptionBulkUpdateResult {
  object: 'subscription_bulk_update'
  updated: number
}

export interface SubscriptionPreferenceUpdated {
  object: 'subscription_preferences'
  tenantId: string
}

export interface SubscriptionViewMutationResult {
  object: 'subscription_view'
  id: string
  deleted?: boolean
}

export const BillingSweepSchema = z.strictObject({
  asOf: unixTimestampSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
})

export type BillingSweepParams = z.infer<typeof BillingSweepSchema>

export interface BillingSweepResult {
  object: 'billing_run_summary'
  asOf: number
  processed: number
  succeeded: number
  failed: number
  skipped: number
  invoiceIds: string[]
}

export const SubscriptionProrationPreviewSchema = z.strictObject({
  changeAt: unixTimestampSchema,
  items: z.array(SubscriptionItemCreateSchema).min(1).max(100),
})

export type SubscriptionProrationPreviewParams = z.infer<
  typeof SubscriptionProrationPreviewSchema
>

export const SubscriptionPreferenceUpdateSchema = z
  .strictObject({
    defaultTaxBehavior: TaxBehaviorSchema,
    defaultCollectionMethod: CollectionMethodSchema,
    defaultBillingTiming: BillingTimingSchema,
    defaultProrationBehavior: ProrationBehaviorSchema,
    defaultInvoiceMode: SubscriptionInvoiceModeSchema,
    notifyDraftInvoice: z.boolean(),
    consolidatedBillingEnabled: z.boolean(),
    calendarMode: z.enum(['ANNIVERSARY', 'FIXED_DATES']),
    calendarDays: z.array(z.number().int().min(1).max(31)).max(31),
    calendarMonths: z.array(z.number().int().min(1).max(12)).max(12),
    pauseResumeEnabled: z.boolean(),
    pauseUnbilledChargeBehavior: PauseUnbilledChargeBehaviorSchema,
    pauseCreditBehavior: PauseCreditBehaviorSchema,
    defaultResumeBillingBehavior: ResumeBillingBehaviorSchema,
    defaultRenewalPricingPolicy: RenewalPricingPolicySchema,
    lockTrialAndFutureActivationPrice: z.boolean(),
    autoApplyCredits: z.boolean(),
    autoApplyExcessPayments: z.boolean(),
    advanceBillingEnabled: z.boolean(),
    advanceBillingMethod: z.literal('INVOICE'),
    automateAdvanceBilling: z.boolean(),
    advanceTermsFromPeriodStart: z.boolean(),
    notifyAdvanceBillingFailure: z.boolean(),
    advanceRules: z
      .array(
        z.strictObject({
          intervalUnit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
          daysBefore: z.number().int().min(1).max(3650),
        })
      )
      .max(4),
  })
  .superRefine((value, context) => {
    if (value.calendarMode === 'FIXED_DATES' && value.calendarDays.length === 0)
      context.addIssue({
        code: 'custom',
        message: 'Select at least one calendar billing day.',
        path: ['calendarDays'],
      })
    if (
      new Set(value.calendarDays).size !== value.calendarDays.length ||
      new Set(value.calendarMonths).size !== value.calendarMonths.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Calendar billing values must be unique.',
      })
    const intervals = value.advanceRules.map((rule) => rule.intervalUnit)
    if (new Set(intervals).size !== intervals.length)
      context.addIssue({
        code: 'custom',
        message: 'Configure each advance-billing interval once.',
        path: ['advanceRules'],
      })
    for (const [index, rule] of value.advanceRules.entries()) {
      const maximum =
        rule.intervalUnit === 'WEEK'
          ? 5
          : rule.intervalUnit === 'MONTH'
            ? 25
            : rule.intervalUnit === 'YEAR'
              ? 363
              : 3650
      if (rule.daysBefore > maximum)
        context.addIssue({
          code: 'custom',
          message: `Advance billing for ${rule.intervalUnit.toLowerCase()} plans cannot exceed ${maximum} days.`,
          path: ['advanceRules', index, 'daysBefore'],
        })
    }
  })

export type SubscriptionPreferenceUpdateParams = z.infer<
  typeof SubscriptionPreferenceUpdateSchema
>
export type SubscriptionPreferenceUpdateInput = z.input<
  typeof SubscriptionPreferenceUpdateSchema
>

const SubscriptionActionTimingSchema = z
  .strictObject({
    timing: SubscriptionChangeTimingSchema.default('IMMEDIATE'),
    effectiveAt: unixTimestampSchema.nullable().optional(),
    reason: optionalTextSchema,
  })
  .superRefine((value, context) => {
    if (value.timing === 'SCHEDULED' && value.effectiveAt == null)
      context.addIssue({
        code: 'custom',
        message: 'Select an effective date for a scheduled action.',
        path: ['effectiveAt'],
      })
  })

export const SubscriptionPauseSchema = SubscriptionActionTimingSchema.extend({
  resumeAt: unixTimestampSchema.nullable().optional(),
  pauseUnbilledBehavior: PauseUnbilledChargeBehaviorSchema.optional(),
  pauseCreditBehavior: PauseCreditBehaviorSchema.optional(),
  resumeBillingBehavior: ResumeBillingBehaviorSchema.optional(),
})
export const SubscriptionResumeSchema = z
  .strictObject({
    timing: z.enum(['IMMEDIATE', 'SCHEDULED']).default('IMMEDIATE'),
    effectiveAt: unixTimestampSchema.nullable().optional(),
    resumeBillingBehavior:
      ResumeBillingBehaviorSchema.default('START_NEW_PERIOD'),
    reason: optionalTextSchema,
  })
  .superRefine((value, context) => {
    if (value.timing === 'SCHEDULED' && value.effectiveAt == null)
      context.addIssue({
        code: 'custom',
        message: 'Select an effective date for a scheduled resume.',
        path: ['effectiveAt'],
      })
  })
export const SubscriptionCancelSchema = SubscriptionActionTimingSchema.extend({
  reasonCode: optionalShortTextSchema,
  feedback: optionalTextSchema,
})
export const SubscriptionExtendSchema = z.strictObject({
  additionalCycles: z.number().int().min(1).max(100_000),
  neverExpires: z.boolean().default(false),
  reason: optionalTextSchema,
})
export const SubscriptionReactivateSchema = z.strictObject({
  startAt: unixTimestampSchema.optional(),
  reason: optionalTextSchema,
})

export const SubscriptionAmendmentCreateSchema = z
  .strictObject({
    timing: SubscriptionChangeTimingSchema.default('IMMEDIATE'),
    effectiveAt: unixTimestampSchema.nullable().optional(),
    prorationBehavior: ProrationBehaviorSchema.default('CREATE_PRORATIONS'),
    paymentFailureBehavior:
      SubscriptionPaymentFailureBehaviorSchema.default('PREVENT_CHANGE'),
    items: z.array(SubscriptionItemCreateSchema).min(1).max(100),
    collectionMethod: CollectionMethodSchema.optional(),
    billingTiming: BillingTimingSchema.optional(),
    paymentTermId: IdSchema.nullable().optional(),
    taxBehavior: TaxBehaviorSchema.optional(),
    invoiceModeOverride: SubscriptionInvoiceModeSchema.nullable().optional(),
    renewalPricingPolicy: RenewalPricingPolicySchema.optional(),
    renewalAdjustmentPercent: z.number().min(0).max(1000).nullable().optional(),
    billingCycleAnchor: unixTimestampSchema.nullable().optional(),
    remainingCycles: z.number().int().min(1).max(100_000).nullable().optional(),
    reason: optionalTextSchema,
  })
  .superRefine((value, context) => {
    if (value.timing === 'SCHEDULED' && value.effectiveAt == null)
      context.addIssue({
        code: 'custom',
        message: 'Select an effective date for a scheduled change.',
        path: ['effectiveAt'],
      })
    if (
      (value.renewalPricingPolicy === 'MARKUP' ||
        value.renewalPricingPolicy === 'MARKDOWN') &&
      (!value.renewalAdjustmentPercent || value.renewalAdjustmentPercent <= 0)
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a renewal adjustment percentage greater than zero.',
        path: ['renewalAdjustmentPercent'],
      })
  })

export const SubscriptionChargeCreateSchema = z.strictObject({
  addonId: IdSchema.nullable().optional(),
  priceId: IdSchema.nullable().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(1_000_000).default(1),
  unitAmount: minorAmountSchema,
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  taxBehavior: TaxBehaviorSchema.default('EXCLUSIVE'),
  isTaxable: z.boolean().default(true),
  invoiceBehavior: z
    .enum(['INVOICE_IMMEDIATELY', 'NEXT_INVOICE'])
    .default('INVOICE_IMMEDIATELY'),
  serviceAt: unixTimestampSchema.nullable().optional(),
})

export const SubscriptionDiscountCreateSchema = z
  .strictObject({
    promotionCode: z.string().trim().min(1).max(120).nullable().optional(),
    subscriptionItemId: IdSchema.nullable().optional(),
    scope: z.enum(['TRANSACTION', 'ITEM']).default('TRANSACTION'),
    discountType: z.enum(['PERCENTAGE', 'AMOUNT']).nullable().optional(),
    percentOff: z.number().min(0.0001).max(100).nullable().optional(),
    amountOff: minorAmountSchema.nullable().optional(),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    duration: z.enum(['ONCE', 'FOREVER', 'REPEATING']).default('FOREVER'),
    durationInCycles: z
      .number()
      .int()
      .min(1)
      .max(100_000)
      .nullable()
      .optional(),
    startsAt: unixTimestampSchema.optional(),
    reason: optionalTextSchema,
  })
  .superRefine((value, context) => {
    const isPromotion = Boolean(value.promotionCode)
    if (!isPromotion && !value.discountType)
      context.addIssue({
        code: 'custom',
        message: 'Choose a percentage or fixed discount.',
        path: ['discountType'],
      })
    if (
      !isPromotion &&
      value.discountType === 'PERCENTAGE' &&
      value.percentOff == null
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a discount percentage.',
        path: ['percentOff'],
      })
    if (
      !isPromotion &&
      value.discountType === 'AMOUNT' &&
      (value.amountOff == null || !value.currency)
    )
      context.addIssue({
        code: 'custom',
        message: 'Enter a fixed amount and currency.',
        path: ['amountOff'],
      })
    if (value.duration === 'REPEATING' && !value.durationInCycles)
      context.addIssue({
        code: 'custom',
        message: 'Enter the number of discounted billing cycles.',
        path: ['durationInCycles'],
      })
    if (value.scope === 'ITEM' && !value.subscriptionItemId)
      context.addIssue({
        code: 'custom',
        message: 'Select the subscription item to discount.',
        path: ['subscriptionItemId'],
      })
  })

export const SubscriptionBulkInvoiceModeSchema = z.strictObject({
  subscriptionIds: z.array(IdSchema).min(1).max(500),
  invoiceModeOverride: SubscriptionInvoiceModeSchema.nullable(),
})

const SubscriptionCustomViewRuleSchema = z.strictObject({
  field: z.enum([
    'status',
    'customerId',
    'customerName',
    'currency',
    'collectionMethod',
    'billingTiming',
    'taxBehavior',
    'createdAt',
    'currentPeriodEnd',
  ]),
  operator: z.enum([
    'EQUALS',
    'NOT_EQUALS',
    'CONTAINS',
    'IN',
    'BEFORE',
    'AFTER',
    'IS_EMPTY',
    'IS_NOT_EMPTY',
  ]),
  value: z.string().trim().max(500).nullable().optional(),
})

export const SubscriptionCustomViewCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120),
    visibility: z.enum(['PRIVATE', 'TENANT']).default('PRIVATE'),
    isFavorite: z.boolean().default(false),
    sortField: z
      .enum(['createdAt', 'currentPeriodEnd', 'status'])
      .nullable()
      .optional(),
    sortDirection: z.enum(['asc', 'desc']).nullable().optional(),
    rules: z.array(SubscriptionCustomViewRuleSchema).max(25),
    columns: z
      .array(
        z.enum([
          'customer',
          'offering',
          'amount',
          'status',
          'billingDate',
          'createdAt',
        ])
      )
      .min(1)
      .max(12),
  })
  .superRefine((value, context) => {
    value.rules.forEach((rule, index) => {
      const values = (rule.value ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      if (
        !['IS_EMPTY', 'IS_NOT_EMPTY'].includes(rule.operator) &&
        values.length === 0
      )
        context.addIssue({
          code: 'custom',
          message: 'Enter a value for this rule.',
          path: ['rules', index, 'value'],
        })
      if (
        rule.operator === 'CONTAINS' &&
        !['customerId', 'customerName', 'currency'].includes(rule.field)
      )
        context.addIssue({
          code: 'custom',
          message: 'Contains is available for customer and currency fields.',
          path: ['rules', index, 'operator'],
        })
      if (
        (rule.operator === 'BEFORE' || rule.operator === 'AFTER') &&
        !['createdAt', 'currentPeriodEnd'].includes(rule.field)
      )
        context.addIssue({
          code: 'custom',
          message: 'Before and after require a date field.',
          path: ['rules', index, 'operator'],
        })
      if (
        rule.field === 'createdAt' &&
        ['IS_EMPTY', 'IS_NOT_EMPTY'].includes(rule.operator)
      )
        context.addIssue({
          code: 'custom',
          message: 'Created date is always present.',
          path: ['rules', index, 'operator'],
        })
      const choices: Partial<Record<typeof rule.field, string[]>> = {
        status: ['DRAFT', 'TRIALING', 'ACTIVE', 'PAUSED', 'CANCELED', 'ENDED'],
        collectionMethod: ['SEND_INVOICE', 'AUTO_CHARGE'],
        billingTiming: ['IN_ADVANCE', 'IN_ARREARS'],
        taxBehavior: ['EXCLUSIVE', 'INCLUSIVE'],
      }
      const allowed = choices[rule.field]
      if (allowed && values.some((entry) => !allowed.includes(entry)))
        context.addIssue({
          code: 'custom',
          message: `Use one of: ${allowed.join(', ')}.`,
          path: ['rules', index, 'value'],
        })
      if (
        ['createdAt', 'currentPeriodEnd'].includes(rule.field) &&
        values.length > 0 &&
        !values.every((entry) => Number.isSafeInteger(Number(entry)))
      )
        context.addIssue({
          code: 'custom',
          message: 'Choose a valid date.',
          path: ['rules', index, 'value'],
        })
    })
  })

export type SubscriptionPauseParams = z.infer<typeof SubscriptionPauseSchema>
export type SubscriptionResumeParams = z.infer<typeof SubscriptionResumeSchema>
export type SubscriptionCancelParams = z.infer<typeof SubscriptionCancelSchema>
export type SubscriptionExtendParams = z.infer<typeof SubscriptionExtendSchema>
export type SubscriptionReactivateParams = z.infer<
  typeof SubscriptionReactivateSchema
>
export type SubscriptionAmendmentCreateParams = z.infer<
  typeof SubscriptionAmendmentCreateSchema
>
export type SubscriptionChargeCreateParams = z.infer<
  typeof SubscriptionChargeCreateSchema
>
export type SubscriptionChargeCreateInput = z.input<
  typeof SubscriptionChargeCreateSchema
>
export type SubscriptionDiscountCreateParams = z.infer<
  typeof SubscriptionDiscountCreateSchema
>
export type SubscriptionDiscountCreateInput = z.input<
  typeof SubscriptionDiscountCreateSchema
>
export type SubscriptionBulkInvoiceModeParams = z.infer<
  typeof SubscriptionBulkInvoiceModeSchema
>
export type SubscriptionCustomViewCreateParams = z.infer<
  typeof SubscriptionCustomViewCreateSchema
>
