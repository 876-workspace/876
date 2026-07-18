import { z } from 'zod'

import { IdSchema, optionalTextSchema } from './common'
import { ItemTypeSchema } from './item'

export const ProductCreateSchema = z.strictObject({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  type: ItemTypeSchema.default('SERVICE'),
  sourceAppId: IdSchema.nullable().optional(),
  notificationRecipients: z.string().trim().max(2000).nullable().optional(),
  redirectUrl: z.url().max(2000).nullable().optional(),
})

export type ProductCreateParams = z.infer<typeof ProductCreateSchema>
export type ProductCreateInput = z.input<typeof ProductCreateSchema>

export interface ProductCreated {
  object: 'product'
  id: string
}

export const ProductUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  description: optionalTextSchema,
  type: ItemTypeSchema.optional(),
  notificationRecipients: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .nullable()
    .optional(),
  redirectUrl: z.url().max(2000).nullable().optional(),
  fallbackPlanId: IdSchema.nullable().optional(),
  isActive: z.boolean().optional(),
})

export type ProductUpdateParams = z.infer<typeof ProductUpdateSchema>
export type ProductUpdateInput = z.input<typeof ProductUpdateSchema>

export interface ProductUpdated {
  object: 'product'
  id: string
}

export interface ProductDeleted {
  object: 'product'
  id: string
  deleted: true
}

export type ProductResource = {
  object: 'product'
  id: string
} & Record<string, unknown>
