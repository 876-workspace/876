import { AppHttpError } from '@/http/errors'

import * as repository from './geo.repository'
import type { Country, Currency, Region } from './geo.schemas'
import {
  serializeCountry,
  serializeCurrency,
  serializeRegion,
} from './geo.serializers'

/**
 * Geographic reference data.
 *
 * Read-only by design: countries, regions, and currencies are seeded reference
 * data, not user-owned records, so the module exposes no write verbs at all.
 */

export async function listCurrencies(): Promise<Currency[]> {
  const rows = await repository.listEnabledCurrencies()
  return rows.map(serializeCurrency)
}

export async function listCountries(): Promise<Country[]> {
  const rows = await repository.listEnabledCountries()
  return rows.map(serializeCountry)
}

/**
 * The regions of one country.
 *
 * An unknown country code is a 404 rather than an empty list, so a caller can
 * tell "this country has no regions on file" from "you asked for a country that
 * does not exist" — the same distinction the FastAPI route drew.
 */
export async function listRegions(countryCode: string): Promise<Region[]> {
  if (!(await repository.countryExists(countryCode)))
    throw new AppHttpError({
      code: 'country/not-found',
      message: 'Country not found.',
      httpStatus: 404,
    })

  const rows = await repository.listRegionsByCountry(countryCode)
  return rows.map(serializeRegion)
}
