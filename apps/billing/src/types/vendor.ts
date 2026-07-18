import { z } from 'zod'

import { IdSchema, optionalShortTextSchema } from './common'
import { currencyCodeSchema } from './currency'

export const VendorCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  email: z.email().nullable().optional(),
  phone: optionalShortTextSchema,
  website: optionalShortTextSchema,
  currency: currencyCodeSchema.nullable().optional(),
  externalReference: IdSchema.nullable().optional(),
})

export type VendorCreateParams = z.infer<typeof VendorCreateSchema>
export type VendorCreateInput = z.input<typeof VendorCreateSchema>

export interface VendorCreated {
  object: 'vendor'
  id: string
}

export const VendorStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

export const VendorUpdateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160).optional(),
  email: z.email().nullable().optional(),
  phone: optionalShortTextSchema,
  website: optionalShortTextSchema,
  currency: currencyCodeSchema.nullable().optional(),
  status: VendorStatusSchema.optional(),
})

export type VendorUpdateParams = z.infer<typeof VendorUpdateSchema>
export type VendorUpdateInput = z.input<typeof VendorUpdateSchema>

export interface VendorUpdated {
  object: 'vendor'
  id: string
}

export interface VendorDeleted {
  object: 'vendor'
  id: string
  deleted: true
}

export type VendorResource = {
  object: 'vendor'
  id: string
} & Record<string, unknown>

export interface VendorTableRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  reference: string
  defaultCurrency: string
  status: 'ACTIVE' | 'ARCHIVED'
}
