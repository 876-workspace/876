import { prisma } from '@/db/client'

import type { CountryRow, CurrencyRow, RegionRow } from './geo.serializers'

/**
 * Every query against the geo tables — `currencies`, `countries`, `regions`.
 *
 * Only the enabled rows are ever returned: a disabled row is reference data
 * withdrawn from circulation, and an endpoint that leaked one would offer a
 * country nothing downstream accepts.
 */

export function listEnabledCurrencies(): Promise<CurrencyRow[]> {
  return prisma.currency.findMany({
    where: { isEnabled: true },
    orderBy: { code: 'asc' },
    select: { code: true, name: true, symbol: true, decimalPlaces: true },
  })
}

export function listEnabledCountries(): Promise<CountryRow[]> {
  return prisma.country.findMany({
    where: { isEnabled: true },
    orderBy: { name: 'asc' },
    select: {
      code: true,
      name: true,
      phonePrefix: true,
      defaultCurrencyCode: true,
    },
  })
}

export async function countryExists(code: string): Promise<boolean> {
  const row = await prisma.country.findUnique({
    where: { code: code.toUpperCase() },
    select: { code: true },
  })
  return row !== null
}

export function listRegionsByCountry(
  countryCode: string
): Promise<RegionRow[]> {
  return prisma.region.findMany({
    where: { countryCode: countryCode.toUpperCase(), isEnabled: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      countryCode: true,
      code: true,
      name: true,
      type: true,
    },
  })
}
