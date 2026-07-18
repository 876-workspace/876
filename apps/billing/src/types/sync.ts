import { z } from 'zod'

import {
  IdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { IntervalUnitSchema } from './plan'
import { SubscriptionStatusSchema } from './subscription'

/** Validates the internal Console→Billing mirror payload for a product. */
export const ProductEnsureSchema = z.strictObject({
  sourceAppId: IdSchema,
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  active: z.boolean().default(true),
})

/** Validates the internal Console→Billing mirror payload for a plan. */
export const PlanEnsureSchema = z.strictObject({
  productId: IdSchema,
  entitlementReferenceId: IdSchema,
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,100}$/),
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  intervalUnit: IntervalUnitSchema,
  intervalCount: z.number().int().min(1).max(3650).default(1),
  trialDays: z.number().int().min(0).max(3650).default(0),
  active: z.boolean().default(true),
})

/** Validates the internal Console→Billing mirror payload for a price. */
export const PriceEnsureSchema = z.strictObject({
  planId: IdSchema,
  entitlementReferenceId: IdSchema,
  nickname: optionalShortTextSchema,
  currency: currencyCodeSchema,
  unitAmount: minorAmountSchema,
  intervalUnit: IntervalUnitSchema,
  intervalCount: z.number().int().min(1).max(3650).default(1),
  active: z.boolean().default(true),
})

/** Validates the internal Core/Console→Billing mirror payload for a customer. */
export const CustomerEnsureSchema = z
  .strictObject({
    customerType: z
      .enum(['CORE_ORGANIZATION', 'CORE_USER'])
      .default('CORE_ORGANIZATION'),
    organizationId: IdSchema.optional(),
    userId: IdSchema.optional(),
    name: z.string().trim().min(1).max(160),
    email: z.email().nullable().optional(),
  })
  .refine(
    (value) =>
      value.customerType === 'CORE_ORGANIZATION'
        ? typeof value.organizationId === 'string' && value.userId === undefined
        : typeof value.userId === 'string' &&
          value.organizationId === undefined,
    {
      message:
        'Provide organizationId for org customers or userId for user customers.',
    }
  )

/** Validates the internal Console→Billing mirror payload for a subscription. */
export const SubscriptionEnsureSchema = z.strictObject({
  externalReference: IdSchema,
  sourceAppId: IdSchema.nullable().optional(),
  customerId: IdSchema,
  items: z
    .array(
      z.strictObject({
        priceEntitlementReferenceId: IdSchema,
        quantity: z.number().int().min(1).max(1_000_000).default(1),
      })
    )
    .min(1)
    .max(100),
  status: SubscriptionStatusSchema.default('ACTIVE'),
  startAt: unixTimestampSchema.optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
})

export type ProductEnsureParams = z.infer<typeof ProductEnsureSchema>
export type PlanEnsureParams = z.infer<typeof PlanEnsureSchema>
export type PriceEnsureParams = z.infer<typeof PriceEnsureSchema>
export type CustomerEnsureParams = z.infer<typeof CustomerEnsureSchema>
export type SubscriptionEnsureParams = z.infer<typeof SubscriptionEnsureSchema>
