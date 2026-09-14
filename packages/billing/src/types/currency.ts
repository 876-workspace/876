import { z } from 'zod'

import type { List } from './common'
import { listSchema } from './common.schema'

export interface Currency {
  object: 'currency'
  currencyCode: string
  isDefault: boolean
  isEnabled: boolean
  createdAt: number
  updatedAt: number
  currency: {
    code: string
    name: string
    symbol: string | null
    decimalPlaces: number
    isActive: boolean
  }
}

export interface CurrencyEnableParams {
  currency: string
}

export interface CurrencyUpdateParams {
  name: string
  symbol?: string | null
  decimalPlaces: number
}

export interface CurrencyMutation {
  object: 'tenant_currency'
  currency: string
}

export interface CurrencyCreated {
  object: 'tenant_currency'
  id: string
}

export const CurrencySchema = z.strictObject({
  object: z.literal('currency'),
  currencyCode: z.string().length(3),
  isDefault: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  currency: z.strictObject({
    code: z.string().length(3),
    name: z.string(),
    symbol: z.string().nullable(),
    decimalPlaces: z.number().int(),
    isActive: z.boolean(),
  }),
}) satisfies z.ZodType<Currency>

export const CurrencyListSchema = listSchema(
  CurrencySchema
) satisfies z.ZodType<List<Currency>>

export const CurrencyMutationSchema = z.strictObject({
  object: z.literal('tenant_currency'),
  currency: z.string().length(3),
}) satisfies z.ZodType<CurrencyMutation>

export const CurrencyCreatedSchema = z.strictObject({
  object: z.literal('tenant_currency'),
  id: z.string(),
}) satisfies z.ZodType<CurrencyCreated>
