import { z } from 'zod'

export const taxAuthoritySchema = z.object({
  object: z.literal('tax_authority'),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  countryCode: z.string(),
  subdivisionCode: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const taxAuthorityCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .toUpperCase()
    .optional()
    .default('JM'),
  subdivisionCode: z.string().trim().min(1).nullable().optional(),
  isDefault: z.boolean().optional().default(false),
})
export const taxAuthorityUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    countryCode: z.string().trim().length(2).toUpperCase().optional(),
    subdivisionCode: z.string().trim().min(1).nullable().optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })
export const taxAuthorityParamsSchema = z.object({
  taxAuthorityId: z.string().min(1),
})

export const taxRateSchema = z.object({
  object: z.literal('tax_rate'),
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  taxType: z.string().nullable(),
  rate: z.string(),
  inclusive: z.boolean(),
  startsAt: z.number().int().nullable(),
  isActive: z.boolean(),
  taxAuthority: taxAuthoritySchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const taxRateCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  taxType: z.string().trim().min(1).nullable().optional(),
  rate: z.union([z.number(), z.string().trim().min(1)]).transform(String),
  taxAuthorityId: z.string().min(1).nullable().optional(),
  inclusive: z.boolean().optional().default(false),
  startsAt: z.number().int().positive().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
})
export const taxRateUpdateBodySchema = z.strictObject({
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
})
export const taxRateParamsSchema = z.object({ taxRateId: z.string().min(1) })

export type TaxAuthorityCreateBody = z.infer<
  typeof taxAuthorityCreateBodySchema
>
export type TaxAuthorityUpdateBody = z.infer<
  typeof taxAuthorityUpdateBodySchema
>
export type TaxRateCreateBody = z.infer<typeof taxRateCreateBodySchema>
export type TaxRateUpdateBody = z.infer<typeof taxRateUpdateBodySchema>
