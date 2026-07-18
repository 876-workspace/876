import { z } from 'zod'

import { optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

export const ItemTypeSchema = z.enum(['GOOD', 'SERVICE'])

export const ItemCreateSchema = z
  .strictObject({
    type: ItemTypeSchema,
    name: z.string().trim().min(1).max(160),
    sku: z.string().trim().min(1).max(120).nullable().optional(),
    unit: z.string().trim().min(1).max(80).nullable().optional(),
    description: optionalTextSchema,
    imageUrl: z.url().max(2000).nullable().optional(),
    defaultSellingAmount: minorAmountSchema.nullable().optional(),
    defaultSellingCurrency: currencyCodeSchema.nullable().optional(),
    defaultCostAmount: minorAmountSchema.nullable().optional(),
    defaultCostCurrency: currencyCodeSchema.nullable().optional(),
    isTaxable: z.boolean().default(false),
    taxCode: z.string().trim().min(1).max(100).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      (value.defaultSellingAmount === null ||
        value.defaultSellingAmount === undefined) !==
      (value.defaultSellingCurrency === null ||
        value.defaultSellingCurrency === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A selling amount and selling currency must be provided together.',
        path: ['defaultSellingAmount'],
      })
    }

    if (
      (value.defaultCostAmount === null ||
        value.defaultCostAmount === undefined) !==
      (value.defaultCostCurrency === null ||
        value.defaultCostCurrency === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A cost amount and cost currency must be provided together.',
        path: ['defaultCostAmount'],
      })
    }
  })

export type ItemCreateParams = z.infer<typeof ItemCreateSchema>
export type ItemCreateInput = z.input<typeof ItemCreateSchema>

export interface ItemCreated {
  object: 'item'
  id: string
}

export const ItemUpdateSchema = z
  .strictObject({
    type: ItemTypeSchema.optional(),
    name: z.string().trim().min(1).max(160).optional(),
    sku: z.string().trim().min(1).max(120).nullable().optional(),
    unit: z.string().trim().min(1).max(80).nullable().optional(),
    description: optionalTextSchema,
    imageUrl: z.url().max(2000).nullable().optional(),
    defaultSellingAmount: minorAmountSchema.nullable().optional(),
    defaultSellingCurrency: currencyCodeSchema.nullable().optional(),
    defaultCostAmount: minorAmountSchema.nullable().optional(),
    defaultCostCurrency: currencyCodeSchema.nullable().optional(),
    isTaxable: z.boolean().optional(),
    taxCode: z.string().trim().min(1).max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.defaultSellingAmount !== undefined ||
      value.defaultSellingCurrency !== undefined
    ) {
      if (
        (value.defaultSellingAmount === null ||
          value.defaultSellingAmount === undefined) !==
        (value.defaultSellingCurrency === null ||
          value.defaultSellingCurrency === undefined)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'A selling amount and selling currency must be provided together.',
          path: ['defaultSellingAmount'],
        })
      }
    }

    if (
      value.defaultCostAmount !== undefined ||
      value.defaultCostCurrency !== undefined
    ) {
      if (
        (value.defaultCostAmount === null ||
          value.defaultCostAmount === undefined) !==
        (value.defaultCostCurrency === null ||
          value.defaultCostCurrency === undefined)
      ) {
        context.addIssue({
          code: 'custom',
          message: 'A cost amount and cost currency must be provided together.',
          path: ['defaultCostAmount'],
        })
      }
    }
  })

export type ItemUpdateParams = z.infer<typeof ItemUpdateSchema>
export type ItemUpdateInput = z.input<typeof ItemUpdateSchema>

export interface ItemUpdated {
  object: 'item'
  id: string
}

export interface ItemDeleted {
  object: 'item'
  id: string
  deleted: true
}

export type ItemResource = {
  object: 'item'
  id: string
} & Record<string, unknown>
