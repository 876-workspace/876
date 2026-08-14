import { z } from 'zod'

import { optionalTextSchema, unixTimestampSchema, IdSchema } from './common'
import { currencyCodeSchema } from './currency'
import { DocumentLineCreateSchema } from './document-line'

export type EstimateStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELED'

export const EstimateCreateSchema = z.strictObject({
  customerId: IdSchema,
  priceListId: IdSchema.nullable().optional(),
  currency: currencyCodeSchema.optional(),
  issueAt: unixTimestampSchema.optional(),
  expiresAt: unixTimestampSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  lines: z.array(DocumentLineCreateSchema).min(1).max(100),
})

export type EstimateCreateParams = z.infer<typeof EstimateCreateSchema>
export type EstimateCreateInput = z.input<typeof EstimateCreateSchema>

export interface EstimateCreated {
  object: 'estimate'
  id: string
}

export const EstimateUpdateSchema = z.strictObject({
  issueAt: unixTimestampSchema.nullable().optional(),
  expiresAt: unixTimestampSchema.nullable().optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
})

export type EstimateUpdateParams = z.infer<typeof EstimateUpdateSchema>
export type EstimateUpdateInput = z.input<typeof EstimateUpdateSchema>

export interface EstimateUpdated {
  object: 'estimate'
  id: string
}

export interface EstimateDeleted {
  object: 'estimate'
  id: string
  deleted: true
}

export type EstimateResource = {
  object: 'estimate'
  id: string
} & Record<string, unknown>
