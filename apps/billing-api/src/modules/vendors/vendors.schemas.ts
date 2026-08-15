import { z } from 'zod'

const nullableTextSchema = z.string().trim().min(1).max(255).nullable()

export const vendorStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

export const vendorSchema = z
  .object({
    object: z.literal('vendor'),
    id: z.string(),
    externalReference: z.string().nullable(),
    name: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    billingAddress: z.unknown().nullable(),
    metadata: z.unknown().nullable(),
    defaultCurrency: z.string().nullable(),
    status: vendorStatusSchema,
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .meta({ id: 'Vendor' })

export const vendorDeletedSchema = z.object({
  object: z.literal('vendor'),
  id: z.string(),
  deleted: z.literal(true),
})

export const vendorCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  email: z.email().nullable().optional(),
  phone: nullableTextSchema.optional(),
  website: nullableTextSchema.optional(),
  currency: z.string().trim().length(3).toUpperCase().nullable().optional(),
  externalReference: z.string().trim().min(1).nullable().optional(),
})

export const vendorUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(160).optional(),
    email: z.email().nullable().optional(),
    phone: nullableTextSchema.optional(),
    website: nullableTextSchema.optional(),
    currency: z.string().trim().length(3).toUpperCase().nullable().optional(),
    status: vendorStatusSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })

export const vendorParamsSchema = z.object({ vendorId: z.string().min(1) })

export const vendorListQuerySchema = z.object({
  status: vendorStatusSchema.optional(),
})

export type VendorCreateBody = z.infer<typeof vendorCreateBodySchema>
export type VendorUpdateBody = z.infer<typeof vendorUpdateBodySchema>
export type VendorListQuery = z.infer<typeof vendorListQuerySchema>
export type VendorResource = z.infer<typeof vendorSchema>
