import { z } from 'zod'

export const currencyCodeSchema = z.string().trim().length(3).toUpperCase()
export const currencyMutationBodySchema = z.strictObject({
  code: currencyCodeSchema,
  name: z.string().trim().min(1),
  symbol: z.string().nullable().optional(),
  decimalPlaces: z.number().int().min(0).max(4),
})
export const currencyEnableBodySchema = z.strictObject({
  currency: currencyCodeSchema,
})
export const currencyUpdateBodySchema = currencyMutationBodySchema.omit({
  code: true,
})
export const currencyDefaultBodySchema = z.strictObject({
  currency: currencyCodeSchema,
})
export const currencyParamsSchema = z.object({ code: currencyCodeSchema })
export const tenantCurrencyMutationSchema = z.object({
  object: z.literal('tenant_currency'),
  currency: currencyCodeSchema,
})
export const tenantCurrencyCreatedSchema = z.strictObject({
  object: z.literal('tenant_currency'),
  id: z.string(),
})
export const currencySchema = z.object({
  object: z.literal('currency'),
  currencyCode: currencyCodeSchema,
  isDefault: z.boolean(),
  isEnabled: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  currency: z.object({
    code: currencyCodeSchema,
    name: z.string(),
    symbol: z.string().nullable(),
    decimalPlaces: z.number().int(),
    isActive: z.boolean(),
  }),
})
export type CurrencyMutationBody = z.infer<typeof currencyMutationBodySchema>
export type CurrencyEnableBody = z.infer<typeof currencyEnableBodySchema>
export type CurrencyUpdateBody = z.infer<typeof currencyUpdateBodySchema>
