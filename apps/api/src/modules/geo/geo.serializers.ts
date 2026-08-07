import type { Country, Currency, Region } from './geo.schemas'

/**
 * Row → API resource.
 *
 * The serializer is where the database's camelCase client names meet the wire's
 * snake_case contract, and where the `object` discriminator is stamped. A Prisma
 * field name must never reach a client directly.
 */

export type CurrencyRow = {
  code: string
  name: string
  symbol: string
  decimalPlaces: number
}

export type CountryRow = {
  code: string
  name: string
  phonePrefix: string | null
  defaultCurrencyCode: string | null
}

export type RegionRow = {
  id: string
  countryCode: string
  code: string
  name: string
  type: string
}

export function serializeCurrency(row: CurrencyRow): Currency {
  return {
    object: 'currency',
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    decimal_places: row.decimalPlaces,
  }
}

export function serializeCountry(row: CountryRow): Country {
  return {
    object: 'country',
    code: row.code,
    name: row.name,
    phone_prefix: row.phonePrefix,
    default_currency_code: row.defaultCurrencyCode,
  }
}

export function serializeRegion(row: RegionRow): Region {
  return {
    object: 'region',
    id: row.id,
    country_code: row.countryCode,
    code: row.code,
    name: row.name,
    type: row.type,
  }
}
