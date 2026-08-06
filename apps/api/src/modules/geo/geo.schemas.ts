import { z } from 'zod'

/**
 * Geographic reference data: currencies, countries, and their regions.
 *
 * Zod is the single source of truth — these schemas type the responses, shape
 * the OpenAPI document, and validate the request params, so there is no second
 * declaration anywhere to drift from.
 */

export const currencySchema = z
  .object({
    object: z.literal('currency').meta({ description: "Always 'currency'." }),
    code: z.string().meta({
      description: 'ISO 4217 currency code.',
      examples: ['JMD', 'USD'],
    }),
    name: z.string().meta({
      description: 'Currency display name.',
      examples: ['Jamaican Dollar'],
    }),
    symbol: z
      .string()
      .meta({ description: 'Currency symbol.', examples: ['J$'] }),
    decimal_places: z
      .number()
      .int()
      .meta({ description: 'Number of decimal places.', examples: [2] }),
  })
  .meta({ id: 'Currency' })

export const countrySchema = z
  .object({
    object: z.literal('country').meta({ description: "Always 'country'." }),
    code: z.string().meta({
      description: 'ISO 3166-1 alpha-2 country code.',
      examples: ['JM'],
    }),
    name: z
      .string()
      .meta({ description: 'Country display name.', examples: ['Jamaica'] }),
    phone_prefix: z
      .string()
      .nullable()
      .meta({
        description: 'International dialing prefix.',
        examples: ['+1-876'],
      }),
    default_currency_code: z
      .string()
      .nullable()
      .meta({
        description: 'Default ISO 4217 currency code for this country.',
        examples: ['JMD'],
      }),
  })
  .meta({ id: 'Country' })

export const regionSchema = z
  .object({
    object: z.literal('region').meta({ description: "Always 'region'." }),
    id: z.string().meta({ description: 'Unique identifier for the region.' }),
    country_code: z.string().meta({
      description: 'ISO 3166-1 alpha-2 country code.',
      examples: ['JM'],
    }),
    code: z.string().meta({ description: 'Region code.', examples: ['JM-01'] }),
    name: z
      .string()
      .meta({ description: 'Region display name.', examples: ['Kingston'] }),
    type: z.string().meta({
      description: 'Region type.',
      examples: ['parish', 'state', 'province'],
    }),
  })
  .meta({ id: 'Region' })

export const listRegionsParamsSchema = z.strictObject({
  country_code: z.string().meta({
    description: 'ISO 3166-1 alpha-2 country code.',
    examples: ['JM'],
  }),
})

export type Currency = z.infer<typeof currencySchema>
export type Country = z.infer<typeof countrySchema>
export type Region = z.infer<typeof regionSchema>
