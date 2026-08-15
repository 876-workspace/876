import { z } from 'zod'

import { IdSchema, optionalShortTextSchema, optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { IntervalUnitSchema } from './plan'

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
export type ProductEnsureParams = z.infer<typeof ProductEnsureSchema>
export type PlanEnsureParams = z.infer<typeof PlanEnsureSchema>
export type PriceEnsureParams = z.infer<typeof PriceEnsureSchema>
