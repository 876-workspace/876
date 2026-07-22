import { z } from 'zod'

import type {
  TaxAuthority,
  TaxAuthorityCreated,
  TaxRate,
  TaxRateCreated,
} from './tax'
import type { List } from './common'
import { createdResourceSchema, listSchema } from './common.schema'

/**
 * The schema for a created tax authority response.
 */
export const TaxAuthorityCreatedSchema = createdResourceSchema(
  'tax_authority'
) satisfies z.ZodType<TaxAuthorityCreated>

/**
 * The schema for a created tax rate response.
 */
export const TaxRateCreatedSchema = createdResourceSchema(
  'tax_rate'
) satisfies z.ZodType<TaxRateCreated>

/**
 * The schema for a tax authority resource.
 */
export const TaxAuthoritySchema = z.object({
  object: z.literal('tax_authority'),
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  countryCode: z.string(),
  subdivisionCode: z.string().nullable(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<TaxAuthority>

/**
 * The schema for a tax rate resource.
 */
export const TaxRateSchema = z.object({
  object: z.literal('tax_rate'),
  id: z.string().min(1),
  name: z.string(),
  description: z.string().nullable(),
  taxType: z.string().nullable(),
  rate: z.string(),
  inclusive: z.boolean(),
  startsAt: z.number().int().nullable(),
  isActive: z.boolean(),
  taxAuthority: TaxAuthoritySchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<TaxRate>

/**
 * The schema for a paginated list of tax authorities.
 */
export const TaxAuthorityListSchema = listSchema(
  TaxAuthoritySchema
) satisfies z.ZodType<List<TaxAuthority>>

/**
 * The schema for a paginated list of tax rates.
 */
export const TaxRateListSchema = listSchema(TaxRateSchema) satisfies z.ZodType<
  List<TaxRate>
>
