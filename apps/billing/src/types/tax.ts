import { z } from 'zod'

import {
  IdSchema,
  countryCodeSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'

export const taxPercentageSchema = z
  .union([z.number().finite().nonnegative(), z.string().trim()])
  .transform((value) => String(value))
  .pipe(
    z
      .string()
      .regex(
        /^(?:100(?:\.0{1,4})?|(?:0|[1-9]\d?)(?:\.\d{1,4})?)$/,
        'Enter a percentage from 0 to 100 with up to four decimal places.'
      )
  )

export const TaxAuthorityCreateSchema = z.strictObject({
  name: z.string().trim().min(2).max(160),
  description: optionalTextSchema,
  countryCode: countryCodeSchema.default('JM'),
  subdivisionCode: z
    .string()
    .trim()
    .min(1)
    .max(12)
    .transform((value) => value.toUpperCase())
    .nullable()
    .optional(),
  isDefault: z.boolean().optional(),
})

export const TaxAuthorityUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(2).max(160).optional(),
    description: optionalTextSchema,
    countryCode: countryCodeSchema.optional(),
    subdivisionCode: z
      .string()
      .trim()
      .min(1)
      .max(12)
      .transform((value) => value.toUpperCase())
      .nullable()
      .optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export const TaxRateCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  description: optionalTextSchema,
  taxType: optionalShortTextSchema,
  rate: taxPercentageSchema,
  taxAuthorityId: IdSchema.nullable().optional(),
  inclusive: z.boolean().default(false),
  startsAt: unixTimestampSchema.nullable().optional(),
  isDefault: z.boolean().optional(),
})

export const TaxRateUpdateSchema = z
  .strictObject({
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export type TaxAuthorityCreateParams = z.infer<typeof TaxAuthorityCreateSchema>
export type TaxAuthorityCreateInput = z.input<typeof TaxAuthorityCreateSchema>
export type TaxAuthorityUpdateParams = z.infer<typeof TaxAuthorityUpdateSchema>
export type TaxAuthorityUpdateInput = z.input<typeof TaxAuthorityUpdateSchema>
export type TaxRateCreateParams = z.infer<typeof TaxRateCreateSchema>
export type TaxRateCreateInput = z.input<typeof TaxRateCreateSchema>
export type TaxRateUpdateParams = z.infer<typeof TaxRateUpdateSchema>
export type TaxRateUpdateInput = z.input<typeof TaxRateUpdateSchema>

export interface TaxAuthorityResource {
  object: 'tax_authority'
  id: string
  name: string
  description: string | null
  countryCode: string
  subdivisionCode: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export interface TaxRateResource {
  object: 'tax_rate'
  id: string
  name: string
  description: string | null
  taxType: string | null
  rate: string
  inclusive: boolean
  startsAt: number | null
  isDefault: boolean
  isActive: boolean
  taxAuthority: TaxAuthorityResource
  createdAt: number
  updatedAt: number
}

export interface TaxAuthorityCreated {
  object: 'tax_authority'
  id: string
}

export interface TaxRateCreated {
  object: 'tax_rate'
  id: string
}

export interface TaxResourceUpdated {
  object: 'tax_authority' | 'tax_rate'
  id: string
}
