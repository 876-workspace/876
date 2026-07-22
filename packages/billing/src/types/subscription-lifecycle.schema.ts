import { z } from 'zod'

import type { List } from './common'
import { listSchema } from './common.schema'
import type {
  SubscriptionBulkUpdateResult,
  SubscriptionChargeCreated,
  SubscriptionChargeMutationResult,
  SubscriptionCustomView,
  SubscriptionDiscountCreated,
  SubscriptionDiscountMutationResult,
  SubscriptionMutationResult,
  SubscriptionPreferences,
  SubscriptionPreferencesUpdated,
  SubscriptionViewMutationResult,
} from './subscription-lifecycle'

/**
 * The schema for a subscription lifecycle mutation result.
 */
export const SubscriptionMutationResultSchema = z.strictObject({
  object: z.enum([
    'subscription',
    'subscription_schedule',
    'subscription_amendment',
  ]),
  id: z.string().min(1),
  scheduled: z.boolean().optional(),
  applied: z.boolean().optional(),
  successor: z.boolean().optional(),
  deleted: z.boolean().optional(),
}) satisfies z.ZodType<SubscriptionMutationResult>

/**
 * The schema for a created subscription charge.
 */
export const SubscriptionChargeCreatedSchema = z.strictObject({
  object: z.literal('subscription_charge'),
  id: z.string().min(1),
  invoiceId: z.string().nullable(),
}) satisfies z.ZodType<SubscriptionChargeCreated>

/**
 * The schema for a created subscription discount.
 */
export const SubscriptionDiscountCreatedSchema = z.strictObject({
  object: z.literal('subscription_discount'),
  id: z.string().min(1),
}) satisfies z.ZodType<SubscriptionDiscountCreated>

/**
 * The schema for a subscription charge mutation result.
 */
export const SubscriptionChargeMutationResultSchema = z.strictObject({
  object: z.literal('subscription_charge'),
  id: z.string().min(1),
  voided: z.boolean(),
}) satisfies z.ZodType<SubscriptionChargeMutationResult>

/**
 * The schema for a subscription discount mutation result.
 */
export const SubscriptionDiscountMutationResultSchema = z.strictObject({
  object: z.literal('subscription_discount'),
  id: z.string().min(1),
  deleted: z.boolean(),
}) satisfies z.ZodType<SubscriptionDiscountMutationResult>

const IntervalUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR'])
const SubscriptionViewRuleSchema = z.strictObject({
  id: z.string().min(1),
  viewId: z.string().min(1),
  position: z.number().int(),
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
  value: z.string().nullable(),
})
const SubscriptionCustomViewSchema = z.strictObject({
  object: z.literal('subscription_view'),
  id: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string(),
  ownerUserId: z.string().nullable(),
  visibility: z.enum(['PRIVATE', 'TENANT']),
  isFavorite: z.boolean(),
  sortField: z.string().nullable(),
  sortDirection: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  rules: z.array(SubscriptionViewRuleSchema),
  columns: z.array(
    z.strictObject({
      id: z.string().min(1),
      viewId: z.string().min(1),
      position: z.number().int(),
      field: z.string(),
    })
  ),
}) satisfies z.ZodType<SubscriptionCustomView>

/**
 * The schema for tenant subscription preferences.
 */
export const SubscriptionPreferencesSchema = z.strictObject({
  object: z.literal('subscription_preferences'),
  tenantId: z.string().min(1),
  defaultTaxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  defaultCollectionMethod: z.enum(['SEND_INVOICE', 'AUTO_CHARGE']),
  defaultBillingTiming: z.enum(['IN_ADVANCE', 'IN_ARREARS']),
  defaultProrationBehavior: z.enum([
    'CREATE_PRORATIONS',
    'ALWAYS_INVOICE',
    'NONE',
  ]),
  defaultInvoiceMode: z.enum(['AUTO_FINALIZE', 'DRAFT']),
  notifyDraftInvoice: z.boolean(),
  consolidatedBillingEnabled: z.boolean(),
  calendarMode: z.enum(['ANNIVERSARY', 'FIXED_DATES']),
  pauseResumeEnabled: z.boolean(),
  pauseUnbilledChargeBehavior: z.enum(['RETAIN', 'INVOICE_IMMEDIATELY']),
  pauseCreditBehavior: z.enum(['NONE', 'PRORATE_CREDIT']),
  defaultResumeBillingBehavior: z.enum([
    'CONTINUE_EXISTING_PERIOD',
    'START_NEW_PERIOD',
  ]),
  defaultRenewalPricingPolicy: z.enum([
    'RETAIN_EXISTING',
    'USE_LATEST',
    'MARKUP',
    'MARKDOWN',
  ]),
  lockTrialAndFutureActivationPrice: z.boolean(),
  autoApplyCredits: z.boolean(),
  autoApplyExcessPayments: z.boolean(),
  advanceBillingEnabled: z.boolean(),
  advanceBillingMethod: z.literal('INVOICE'),
  automateAdvanceBilling: z.boolean(),
  advanceTermsFromPeriodStart: z.boolean(),
  notifyAdvanceBillingFailure: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  advanceRules: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      intervalUnit: IntervalUnitSchema,
      daysBefore: z.number().int(),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    })
  ),
  calendarDays: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      dayOfMonth: z.number().int(),
    })
  ),
  calendarMonths: z.array(
    z.strictObject({
      tenantId: z.string().min(1),
      month: z.number().int(),
    })
  ),
}) satisfies z.ZodType<SubscriptionPreferences>

/**
 * The schema for a subscription-preferences update confirmation.
 */
export const SubscriptionPreferencesUpdatedSchema = z.strictObject({
  object: z.literal('subscription_preferences'),
  tenantId: z.string().min(1),
}) satisfies z.ZodType<SubscriptionPreferencesUpdated>

/**
 * The schema for a bulk subscription update result.
 */
export const SubscriptionBulkUpdateResultSchema = z.strictObject({
  object: z.literal('subscription_bulk_update'),
  updated: z.number().int().nonnegative(),
}) satisfies z.ZodType<SubscriptionBulkUpdateResult>

/**
 * The schema for a paginated list of subscription custom views.
 */
export const SubscriptionCustomViewListSchema = listSchema(
  SubscriptionCustomViewSchema
) satisfies z.ZodType<List<SubscriptionCustomView>>

/**
 * The schema for a subscription view mutation result.
 */
export const SubscriptionViewMutationResultSchema = z.strictObject({
  object: z.literal('subscription_view'),
  id: z.string().min(1),
  deleted: z.boolean().optional(),
}) satisfies z.ZodType<SubscriptionViewMutationResult>
