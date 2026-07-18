import { z } from 'zod'

export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Use a three-letter currency code.')
  .transform((value) => value.toUpperCase())

/** A monetary amount represented in the currency's smallest unit. */
export const minorAmountSchema = z
  .union([
    z.number().int().nonnegative().safe(),
    z.string().regex(/^(0|[1-9]\d*)$/, 'Use a non-negative integer amount.'),
  ])
  .transform((value) => BigInt(value))

/** A signed monetary adjustment represented in the smallest currency unit. */
export const signedMinorAmountSchema = z
  .union([
    z.number().int().safe(),
    z.string().regex(/^-?(0|[1-9]\d*)$/, 'Use an integer amount.'),
  ])
  .transform((value) => BigInt(value))

export const TenantCurrencyEnableSchema = z.strictObject({
  currency: currencyCodeSchema,
})

export const CurrencyCreateSchema = z.strictObject({
  code: currencyCodeSchema,
  name: z.string().min(1, 'Name is required.'),
  symbol: z.string().nullable().optional(),
  decimalPlaces: z.number().int().min(0).max(4),
})

export const CurrencyUpdateSchema = z.strictObject({
  name: z.string().min(1, 'Name is required.'),
  symbol: z.string().nullable().optional(),
  decimalPlaces: z.number().int().min(0).max(4),
})

export type TenantCurrencyEnableParams = z.infer<
  typeof TenantCurrencyEnableSchema
>
export type TenantCurrencyEnableInput = z.input<
  typeof TenantCurrencyEnableSchema
>

export type CurrencyCreateParams = z.infer<typeof CurrencyCreateSchema>
export type CurrencyCreateInput = z.input<typeof CurrencyCreateSchema>
export type CurrencyUpdateParams = z.infer<typeof CurrencyUpdateSchema>
export type CurrencyUpdateInput = z.input<typeof CurrencyUpdateSchema>

export interface TenantCurrencyCreated {
  object: 'tenant_currency'
  currency: string
}
