import { z } from 'zod'

import { IdSchema, optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

const PriceListTierSchema = z.strictObject({
  fromUnit: z.number().int().positive(),
  toUnit: z.number().int().positive().nullable().optional(),
  unitAmount: minorAmountSchema,
})

const PriceListEntrySchema = z.strictObject({
  priceId: IdSchema,
  unitAmount: minorAmountSchema.nullable().optional(),
  tiers: z.array(PriceListTierSchema).max(100).default([]),
})

export const PriceListCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160),
    description: optionalTextSchema,
    mode: z.enum(['PERCENTAGE', 'CUSTOM']),
    direction: z.enum(['MARKUP', 'MARKDOWN']).nullable().optional(),
    percentage: z.number().positive().max(1000).nullable().optional(),
    currency: currencyCodeSchema.nullable().optional(),
    rounding: z.enum(['NONE', 'NEAREST', 'UP', 'DOWN']).default('NONE'),
    roundingPrecision: z.number().int().min(0).max(6).default(2),
    entries: z.array(PriceListEntrySchema).max(10_000).default([]),
  })
  .superRefine((value, context) => {
    if (value.mode === 'PERCENTAGE' && (!value.direction || !value.percentage))
      context.addIssue({
        code: 'custom',
        message: 'Percentage price lists require a direction and percentage.',
        path: ['percentage'],
      })
    if (
      value.mode === 'CUSTOM' &&
      (!value.currency || value.entries.length === 0)
    )
      context.addIssue({
        code: 'custom',
        message:
          'Custom price lists require a currency and at least one entry.',
        path: ['entries'],
      })
    if (
      value.mode === 'PERCENTAGE' &&
      value.direction === 'MARKDOWN' &&
      (value.percentage ?? 0) > 100
    )
      context.addIssue({
        code: 'custom',
        message: 'A markdown cannot exceed 100%.',
        path: ['percentage'],
      })
    value.entries.forEach((entry, index) => {
      const hasAmount =
        entry.unitAmount !== null && entry.unitAmount !== undefined
      const hasTiers = entry.tiers.length > 0
      if (hasAmount === hasTiers)
        context.addIssue({
          code: 'custom',
          message: 'Use either an individual amount or volume tiers.',
          path: ['entries', index],
        })
      const sorted = [...entry.tiers].sort(
        (left, right) => left.fromUnit - right.fromUnit
      )
      sorted.forEach((tier, tierIndex) => {
        const previous = sorted[tierIndex - 1]
        if (
          tier.toUnit !== null &&
          tier.toUnit !== undefined &&
          tier.toUnit < tier.fromUnit
        )
          context.addIssue({
            code: 'custom',
            message: 'A volume range cannot end before it starts.',
            path: ['entries', index, 'tiers', tierIndex, 'toUnit'],
          })
        if (
          previous &&
          (previous.toUnit === null ||
            previous.toUnit === undefined ||
            previous.toUnit >= tier.fromUnit)
        )
          context.addIssue({
            code: 'custom',
            message: 'Volume ranges cannot overlap.',
            path: ['entries', index, 'tiers', tierIndex, 'fromUnit'],
          })
      })
    })
  })

export const PriceListUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  description: optionalTextSchema,
  isActive: z.boolean().optional(),
})

export const PriceListResolveSchema = z.strictObject({
  priceId: IdSchema,
  quantity: z.number().int().positive(),
})

export type PriceListCreateParams = z.infer<typeof PriceListCreateSchema>
export type PriceListCreateInput = z.input<typeof PriceListCreateSchema>
export type PriceListUpdateParams = z.infer<typeof PriceListUpdateSchema>
export type PriceListUpdateInput = z.input<typeof PriceListUpdateSchema>
export type PriceListResolveParams = z.infer<typeof PriceListResolveSchema>

export interface PriceListCreated {
  object: 'price_list'
  id: string
}

export interface PriceListDeleted extends PriceListCreated {
  deleted: true
}

export type PriceListResource = PriceListCreated & Record<string, unknown>
