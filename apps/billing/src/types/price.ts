import { z } from 'zod'

import { IdSchema, optionalShortTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { IntervalUnitSchema } from './plan'

export const PricingModelSchema = z.enum([
  'FLAT',
  'PER_UNIT',
  'VOLUME',
  'TIERED',
  'PACKAGE',
])
export const PriceTypeSchema = z.enum(['ONE_TIME', 'RECURRING'])

export const PriceTierCreateSchema = z
  .strictObject({
    fromUnit: z.number().int().min(1),
    toUnit: z.number().int().min(1).nullable().optional(),
    unitAmount: minorAmountSchema.nullable().optional(),
    flatAmount: minorAmountSchema.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.toUnit !== null &&
      value.toUnit !== undefined &&
      value.toUnit < value.fromUnit
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'The tier end must be greater than or equal to the tier start.',
        path: ['toUnit'],
      })
    }

    if (
      (value.unitAmount === null || value.unitAmount === undefined) &&
      (value.flatAmount === null || value.flatAmount === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Each tier requires a unit amount or flat amount.',
        path: ['unitAmount'],
      })
    }
  })

export const PriceCreateSchema = z
  .strictObject({
    itemId: IdSchema.nullable().optional(),
    planId: IdSchema.nullable().optional(),
    addonId: IdSchema.nullable().optional(),
    nickname: optionalShortTextSchema,
    entitlementReferenceId: IdSchema.nullable().optional(),
    currency: currencyCodeSchema,
    unitAmount: minorAmountSchema.nullable().optional(),
    pricingModel: PricingModelSchema.default('FLAT'),
    priceType: PriceTypeSchema.default('ONE_TIME'),
    intervalUnit: IntervalUnitSchema.nullable().optional(),
    intervalCount: z.number().int().min(1).max(3650).nullable().optional(),
    unitName: z.string().trim().min(1).max(80).nullable().optional(),
    packageSize: z.number().int().min(1).max(1_000_000).nullable().optional(),
    isTaxable: z.boolean().default(false),
    tiers: z.array(PriceTierCreateSchema).max(100).default([]),
  })
  .superRefine((value, context) => {
    const itemId = value.itemId ?? null
    const planId = value.planId ?? null
    const addonId = value.addonId ?? null
    const hasUnitAmount =
      value.unitAmount !== null && value.unitAmount !== undefined

    if ([itemId, planId, addonId].filter(Boolean).length !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'A price must belong to exactly one item, plan, or add-on.',
        path: ['itemId'],
      })
    }

    if (
      value.priceType === 'ONE_TIME' &&
      (value.intervalUnit != null || value.intervalCount != null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'One-time prices cannot include a billing interval.',
        path: ['priceType'],
      })
    }

    if (
      value.priceType === 'RECURRING' &&
      (!value.intervalUnit || !value.intervalCount)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Recurring prices require an interval unit and count.',
        path: ['intervalUnit'],
      })
    }

    if (
      (value.pricingModel === 'FLAT' || value.pricingModel === 'PER_UNIT') &&
      !hasUnitAmount
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Flat and per-unit prices require a unit amount.',
        path: ['unitAmount'],
      })
    }

    if (
      (value.pricingModel === 'VOLUME' || value.pricingModel === 'TIERED') &&
      value.tiers.length === 0
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Volume and tiered prices require at least one tier.',
        path: ['tiers'],
      })
    }

    if (value.pricingModel === 'PACKAGE' && !value.packageSize) {
      context.addIssue({
        code: 'custom',
        message: 'Package prices require a package size.',
        path: ['packageSize'],
      })
    }

    if (
      new Set(value.tiers.map((tier) => tier.fromUnit)).size !==
      value.tiers.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Each price tier must start at a unique quantity.',
        path: ['tiers'],
      })
    }
  })

export type PriceCreateParams = z.infer<typeof PriceCreateSchema>
export type PriceCreateInput = z.input<typeof PriceCreateSchema>

export interface PriceCreated {
  object: 'price'
  id: string
}

export const PriceUpdateSchema = z.strictObject({
  nickname: z.string().trim().min(1).max(160).nullable().optional(),
  isActive: z.boolean().optional(),
})

export type PriceUpdateParams = z.infer<typeof PriceUpdateSchema>
export type PriceUpdateInput = z.input<typeof PriceUpdateSchema>

export interface PriceUpdated {
  object: 'price'
  id: string
}

export interface PriceDeleted {
  object: 'price'
  id: string
  deleted: true
}

export type PriceResource = {
  object: 'price'
  id: string
} & Record<string, unknown>
