import { z } from 'zod'

import { optionalTextSchema, unixTimestampSchema, IdSchema } from './common'
import { currencyCodeSchema } from './currency'
import { DocumentLineCreateSchema } from './document-line'

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CANCELED'

export const QuoteCreateSchema = z.strictObject({
  customerId: IdSchema,
  priceListId: IdSchema.nullable().optional(),
  currency: currencyCodeSchema.optional(),
  issueAt: unixTimestampSchema.optional(),
  expiresAt: unixTimestampSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  lines: z.array(DocumentLineCreateSchema).min(1).max(100),
})

export type QuoteCreateParams = z.infer<typeof QuoteCreateSchema>
export type QuoteCreateInput = z.input<typeof QuoteCreateSchema>

export interface QuoteCreated {
  object: 'quote'
  id: string
}

export const QuoteUpdateSchema = z.strictObject({
  issueAt: unixTimestampSchema.nullable().optional(),
  expiresAt: unixTimestampSchema.nullable().optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
})

export type QuoteUpdateParams = z.infer<typeof QuoteUpdateSchema>
export type QuoteUpdateInput = z.input<typeof QuoteUpdateSchema>

export interface QuoteUpdated {
  object: 'quote'
  id: string
}

export interface QuoteDeleted {
  object: 'quote'
  id: string
  deleted: true
}

export type QuoteResource = {
  object: 'quote'
  id: string
} & Record<string, unknown>
