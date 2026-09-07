import { z } from 'zod'

import { optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

export const ItemTypeSchema = z.enum(['GOOD', 'SERVICE'])
export const ItemVariantModeSchema = z.enum(['single', 'variant'])

export const ItemVariantOptionInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  values: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
})

export type ItemVariantOptionInput = z.infer<
  typeof ItemVariantOptionInputSchema
>

function validateVariantOptions(
  options: ItemVariantOptionInput[] | undefined,
  context: z.RefinementCtx
) {
  if (!options) return

  const names = new Set<string>()
  let combinationCount = 1
  options.forEach((option, optionIndex) => {
    const normalizedName = option.name.toLocaleLowerCase()
    if (names.has(normalizedName))
      context.addIssue({
        code: 'custom',
        message: 'Variant option names must be unique.',
        path: ['variantOptions', optionIndex, 'name'],
      })
    names.add(normalizedName)

    const values = new Set<string>()
    option.values.forEach((value, valueIndex) => {
      const normalizedValue = value.toLocaleLowerCase()
      if (values.has(normalizedValue))
        context.addIssue({
          code: 'custom',
          message: 'Values within a variant option must be unique.',
          path: ['variantOptions', optionIndex, 'values', valueIndex],
        })
      values.add(normalizedValue)
    })
    combinationCount *= option.values.length
  })

  if (combinationCount > 100)
    context.addIssue({
      code: 'custom',
      message: 'An item may generate at most 100 variants.',
      path: ['variantOptions'],
    })
}

function validateStockCreate(
  value: {
    type: 'GOOD' | 'SERVICE'
    variantMode: 'single' | 'variant'
    trackStock: boolean
    stockQuantity?: number
    lowStockThreshold?: number | null
    allowOutOfStock: boolean
  },
  context: z.RefinementCtx
) {
  if (value.type === 'SERVICE' && value.trackStock) {
    context.addIssue({
      code: 'custom',
      message: 'Stock tracking is available only for goods.',
      path: ['trackStock'],
    })
  }

  if (!value.trackStock && value.stockQuantity !== undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Enable stock tracking before setting a stock quantity.',
      path: ['stockQuantity'],
    })
  }

  if (value.variantMode === 'variant' && value.stockQuantity !== undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Opening stock belongs to individual variants.',
      path: ['stockQuantity'],
    })
  }

  if (!value.trackStock && value.lowStockThreshold != null) {
    context.addIssue({
      code: 'custom',
      message: 'Enable stock tracking before setting a low-stock threshold.',
      path: ['lowStockThreshold'],
    })
  }

  if (!value.trackStock && value.allowOutOfStock) {
    context.addIssue({
      code: 'custom',
      message: 'Enable stock tracking before allowing out-of-stock sales.',
      path: ['allowOutOfStock'],
    })
  }
}

export const ItemCreateSchema = z
  .strictObject({
    type: ItemTypeSchema,
    variantMode: ItemVariantModeSchema.default('single'),
    variantOptions: z.array(ItemVariantOptionInputSchema).min(1).max(3).optional(),
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
    trackStock: z.boolean().default(false),
    stockQuantity: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).nullable().optional(),
    allowOutOfStock: z.boolean().default(false),
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

    if (value.variantMode === 'variant' && !value.variantOptions?.length)
      context.addIssue({
        code: 'custom',
        message: 'A variant item needs at least one option.',
        path: ['variantOptions'],
      })
    if (value.variantMode === 'single' && value.variantOptions?.length)
      context.addIssue({
        code: 'custom',
        message: 'Variant options are accepted only for variant items.',
        path: ['variantOptions'],
      })

    validateVariantOptions(value.variantOptions, context)
    validateStockCreate(value, context)
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
    trackStock: z.boolean().optional(),
    lowStockThreshold: z.number().int().min(0).nullable().optional(),
    allowOutOfStock: z.boolean().optional(),
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

    if (value.type === 'SERVICE' && value.trackStock === true) {
      context.addIssue({
        code: 'custom',
        message: 'Stock tracking is available only for goods.',
        path: ['trackStock'],
      })
    }
  })

export type ItemUpdateParams = z.infer<typeof ItemUpdateSchema>
export type ItemUpdateInput = z.input<typeof ItemUpdateSchema>

export const ItemStockAdjustmentSchema = z.strictObject({
  quantity: z.number().int(),
  note: z.string().trim().min(1).max(500).nullable().optional(),
})

export type ItemStockAdjustmentParams = z.infer<
  typeof ItemStockAdjustmentSchema
>

export const ItemVariantUpdateSchema = z
  .strictObject({
    sku: z.string().trim().min(1).max(120).nullable().optional(),
    defaultSellingAmount: minorAmountSchema.nullable().optional(),
    defaultSellingCurrency: currencyCodeSchema.nullable().optional(),
    defaultCostAmount: minorAmountSchema.nullable().optional(),
    defaultCostCurrency: currencyCodeSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, context) => {
    for (const [amountKey, currencyKey, label] of [
      ['defaultSellingAmount', 'defaultSellingCurrency', 'selling'],
      ['defaultCostAmount', 'defaultCostCurrency', 'cost'],
    ] as const) {
      if (value[amountKey] === undefined && value[currencyKey] === undefined)
        continue
      if (
        (value[amountKey] === null || value[amountKey] === undefined) !==
        (value[currencyKey] === null || value[currencyKey] === undefined)
      )
        context.addIssue({
          code: 'custom',
          message: `A ${label} amount and currency must be provided together.`,
          path: [amountKey],
        })
    }
  })

export type ItemVariantUpdateParams = z.infer<typeof ItemVariantUpdateSchema>

export const ItemVariantStockAllocationSchema = z.strictObject({
  values: z.array(z.string().trim().min(1).max(80)).min(1).max(3),
  quantity: z.number().int().min(0),
})

export const ItemVariantGenerateSchema = z
  .strictObject({
    options: z.array(ItemVariantOptionInputSchema).min(1).max(3),
    stockAllocations: z.array(ItemVariantStockAllocationSchema).max(100).optional(),
  })
  .superRefine((value, context) => validateVariantOptions(value.options, context))

export type ItemVariantGenerateParams = z.infer<
  typeof ItemVariantGenerateSchema
>

export const ItemMediaAttachSchema = z.strictObject({
  fileId: z.string().startsWith('file_'),
  position: z.number().int().min(0).optional(),
})
export type ItemMediaAttachParams = z.infer<typeof ItemMediaAttachSchema>

export const ItemMediaReorderSchema = z.strictObject({
  fileIds: z.array(z.string().startsWith('file_')).max(20),
})
export type ItemMediaReorderParams = z.infer<typeof ItemMediaReorderSchema>

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
