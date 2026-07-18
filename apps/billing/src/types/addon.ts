import { z } from 'zod'

import { IdSchema, optionalTextSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { ItemTypeSchema } from './item'
import { IntervalUnitSchema } from './plan'
import { PriceTierCreateSchema, PricingModelSchema } from './price'

export const AddonAssociationTypeSchema = z.enum([
  'OPTIONAL',
  'RECOMMENDED',
  'MANDATORY',
])
export const AddonAssociationEventSchema = z.enum([
  'SUBSCRIPTION_ACTIVATION',
  'PLAN_CHANGE',
  'TRIAL_ACTIVATION',
])
export const AddonAssociationFrequencySchema = z.enum([
  'EVERY_OCCURRENCE',
  'FIRST_OCCURRENCE',
])

const AddonAssociationSchema = z.strictObject({
  planId: IdSchema,
  associationType: AddonAssociationTypeSchema.default('OPTIONAL'),
  events: z
    .array(AddonAssociationEventSchema)
    .min(1)
    .default(['SUBSCRIPTION_ACTIVATION']),
  frequency: AddonAssociationFrequencySchema.default('EVERY_OCCURRENCE'),
})

const AddonPriceSchema = z
  .strictObject({
    currency: currencyCodeSchema,
    unitAmount: minorAmountSchema.nullable().optional(),
    pricingModel: PricingModelSchema.default('FLAT'),
    unitName: z.string().trim().min(1).max(80).nullable().optional(),
    packageSize: z
      .number()
      .int()
      .positive()
      .max(1_000_000)
      .nullable()
      .optional(),
    tiers: z.array(PriceTierCreateSchema).max(100).default([]),
  })
  .superRefine((value, context) => {
    const hasAmount =
      value.unitAmount !== null && value.unitAmount !== undefined
    if (
      ['FLAT', 'PER_UNIT', 'PACKAGE'].includes(value.pricingModel) &&
      !hasAmount
    )
      context.addIssue({
        code: 'custom',
        message: 'This pricing model requires an amount.',
        path: ['unitAmount'],
      })
    if (value.pricingModel === 'PACKAGE' && !value.packageSize)
      context.addIssue({
        code: 'custom',
        message: 'Package pricing requires a package size.',
        path: ['packageSize'],
      })
    if (
      ['VOLUME', 'TIERED'].includes(value.pricingModel) &&
      value.tiers.length === 0
    )
      context.addIssue({
        code: 'custom',
        message: 'Volume and tiered pricing require tiers.',
        path: ['tiers'],
      })
  })

export const AddonCreateSchema = z
  .strictObject({
    productId: IdSchema,
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{2,100}$/),
    name: z.string().trim().min(1).max(160),
    description: optionalTextSchema,
    imageUrl: z.url().max(2000).nullable().optional(),
    type: ItemTypeSchema.default('SERVICE'),
    priceType: z.enum(['ONE_TIME', 'RECURRING']).default('RECURRING'),
    intervalUnit: IntervalUnitSchema.nullable().optional(),
    intervalCount: z.number().int().positive().max(3650).nullable().optional(),
    unitName: z.string().trim().min(1).max(80).nullable().optional(),
    taxCode: z.string().trim().min(1).max(120).nullable().optional(),
    isTaxable: z.boolean().default(false),
    showInCheckout: z.boolean().default(true),
    allowPortalManagement: z.boolean().default(false),
    price: AddonPriceSchema.nullable().optional(),
    associations: z.array(AddonAssociationSchema).max(500).default([]),
  })
  .superRefine((value, context) => {
    const recurring = value.priceType === 'RECURRING'
    if (recurring && (!value.intervalUnit || !value.intervalCount))
      context.addIssue({
        code: 'custom',
        message: 'Recurring add-ons require a billing interval.',
        path: ['intervalUnit'],
      })
    if (
      !recurring &&
      (value.intervalUnit != null || value.intervalCount != null)
    )
      context.addIssue({
        code: 'custom',
        message: 'One-time add-ons cannot include a billing interval.',
        path: ['priceType'],
      })
  })

export const AddonUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  description: optionalTextSchema,
  imageUrl: z.url().max(2000).nullable().optional(),
  unitName: z.string().trim().min(1).max(80).nullable().optional(),
  taxCode: z.string().trim().min(1).max(120).nullable().optional(),
  isTaxable: z.boolean().optional(),
  showInCheckout: z.boolean().optional(),
  allowPortalManagement: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export const AddonAssociationUpsertSchema = AddonAssociationSchema.extend({
  isActive: z.boolean().default(true),
})

export const AddonAssociationBatchUpsertSchema = z
  .strictObject({
    associations: z.array(AddonAssociationUpsertSchema).min(1).max(500),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.associations.map((association) => association.planId))
        .size !== value.associations.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Each plan can appear only once.',
        path: ['associations'],
      })
  })

export const AddonAssociationMutationSchema = z.union([
  AddonAssociationUpsertSchema,
  AddonAssociationBatchUpsertSchema,
])

export type AddonCreateParams = z.infer<typeof AddonCreateSchema>
export type AddonCreateInput = z.input<typeof AddonCreateSchema>
export type AddonUpdateParams = z.infer<typeof AddonUpdateSchema>
export type AddonUpdateInput = z.input<typeof AddonUpdateSchema>
export type AddonAssociationUpsertParams = z.infer<
  typeof AddonAssociationUpsertSchema
>
export type AddonAssociationBatchUpsertParams = z.infer<
  typeof AddonAssociationBatchUpsertSchema
>

export interface AddonCreated {
  object: 'addon'
  id: string
}

export interface AddonDeleted extends AddonCreated {
  deleted: true
}

export type AddonResource = AddonCreated & Record<string, unknown>

export const AddonCloneSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,100}$/),
  name: z.string().trim().min(1).max(160),
})

export type AddonCloneParams = z.infer<typeof AddonCloneSchema>
export type AddonCloneInput = z.input<typeof AddonCloneSchema>
