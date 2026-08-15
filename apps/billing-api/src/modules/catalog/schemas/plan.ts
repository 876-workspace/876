import { z } from 'zod'

import { IdSchema, optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

export const IntervalUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR'])

export const PlanCreateSchema = z
  .strictObject({
    productId: IdSchema,
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{2,100}$/),
    name: z.string().trim().min(1).max(160),
    description: optionalTextSchema,
    imageUrl: z.url().max(2000).nullable().optional(),
    unitName: z.string().trim().min(1).max(80).nullable().optional(),
    taxCode: z.string().trim().min(1).max(120).nullable().optional(),
    entitlementReferenceId: IdSchema.nullable().optional(),
    intervalUnit: IntervalUnitSchema,
    intervalCount: z.number().int().min(1).max(3650).default(1),
    billingCycleCount: z.number().int().min(1).max(9999).nullable().optional(),
    trialDays: z.number().int().min(0).max(3650).default(0),
    setupFeeAmount: minorAmountSchema.nullable().optional(),
    setupFeeCurrency: currencyCodeSchema.nullable().optional(),
    isTaxable: z.boolean().default(false),
    isFree: z.boolean().default(false),
    showInCheckout: z.boolean().default(true),
  })
  .superRefine((value, context) => {
    if (
      (value.setupFeeAmount === null || value.setupFeeAmount === undefined) !==
      (value.setupFeeCurrency === null || value.setupFeeCurrency === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A setup fee amount and currency must be provided together.',
        path: ['setupFeeAmount'],
      })
    }
  })

export type PlanCreateParams = z.infer<typeof PlanCreateSchema>
export type PlanCreateInput = z.input<typeof PlanCreateSchema>

export interface PlanCreated {
  object: 'plan'
  id: string
}

export const PlanUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160).optional(),
    description: optionalTextSchema,
    imageUrl: z.url().max(2000).nullable().optional(),
    unitName: z.string().trim().min(1).max(80).nullable().optional(),
    taxCode: z.string().trim().min(1).max(120).nullable().optional(),
    trialDays: z.number().int().min(0).max(730).optional(),
    setupFeeAmount: minorAmountSchema.nullable().optional(),
    setupFeeCurrency: currencyCodeSchema.nullable().optional(),
    isTaxable: z.boolean().optional(),
    isFree: z.boolean().optional(),
    showInCheckout: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.setupFeeAmount !== undefined ||
      value.setupFeeCurrency !== undefined
    ) {
      if (
        (value.setupFeeAmount === null ||
          value.setupFeeAmount === undefined) !==
        (value.setupFeeCurrency === null ||
          value.setupFeeCurrency === undefined)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'A setup fee amount and currency must be provided together.',
          path: ['setupFeeAmount'],
        })
      }
    }
  })

export type PlanUpdateParams = z.infer<typeof PlanUpdateSchema>
export type PlanUpdateInput = z.input<typeof PlanUpdateSchema>

export interface PlanUpdated {
  object: 'plan'
  id: string
}

export interface PlanDeleted {
  object: 'plan'
  id: string
  deleted: true
}

export type PlanResource = {
  object: 'plan'
  id: string
} & Record<string, unknown>

export const PlanCloneSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,100}$/),
  name: z.string().trim().min(1).max(160),
})

export type PlanCloneParams = z.infer<typeof PlanCloneSchema>
export type PlanCloneInput = z.input<typeof PlanCloneSchema>
