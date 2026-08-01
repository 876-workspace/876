import 'server-only'

import { cache } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'
import type { AddressErrorCode } from '@/lib/errors/address'

export type ResolvedRegion = {
  regionCode: string | null
  regionName: string | null
}

export type RegionResolution =
  | { ok: true; region: ResolvedRegion }
  | { ok: false; code: AddressErrorCode }

/**
 * The country and region catalogs are small, change rarely, and are read on
 * every address write. Deduplicating them per request keeps a form that
 * validates several addresses from issuing the same platform call repeatedly.
 */
const listCountries = cache(async () => {
  const platform = await getPlatformClient()
  return platform.countries.list()
})

const listRegions = cache(async (countryCode: string) => {
  const platform = await getPlatformClient()
  return platform.regions.list(countryCode)
})

/**
 * Resolves a core region id (`organizations.region_id`) to its canonical code
 * and name. Used when seeding a branch from the organization profile, which
 * references a region by id rather than by code.
 *
 * Returns null when the region cannot be resolved — the caller keeps the rest
 * of the address rather than inventing a region.
 */
export async function resolveRegionById(
  countryCode: string,
  regionId: string
): Promise<ResolvedRegion | null> {
  const regions = await listRegions(countryCode)
  if (regions.error) return null

  const region = regions.data.find((entry) => entry.id === regionId)
  if (!region) return null

  return { regionCode: region.code, regionName: region.name }
}

/**
 * Resolves a Couriers region code to the core region id used by organization
 * locations. A missing or unavailable catalog leaves the field absent rather
 * than risking a corrupt cross-service reference.
 */
export async function resolveRegionIdByCode(
  countryCode: string,
  regionCode: string | null
): Promise<string | null> {
  if (!regionCode) return null

  const regions = await listRegions(countryCode)
  if (regions.error) return null

  return regions.data.find((entry) => entry.code === regionCode)?.id ?? null
}

/**
 * Resolves a client-supplied country and region code against the platform geo
 * catalog, returning the canonical region code and its display name.
 *
 * The catalog is the source of truth: an unknown or disabled country is
 * rejected, a country that has subdivisions requires one, and a country that
 * has none stores neither code nor name. A platform outage is reported as
 * unavailable rather than being silently accepted, so a bad geography can never
 * be written just because the catalog could not be reached.
 */
export async function resolveRegion(
  countryCode: string,
  regionCode: string | undefined
): Promise<RegionResolution> {
  const countries = await listCountries()
  if (countries.error)
    return { ok: false, code: 'address/geography-unavailable' }

  const country = countries.data.find((entry) => entry.code === countryCode)
  if (!country) return { ok: false, code: 'address/unknown-country' }

  const regions = await listRegions(countryCode)
  if (regions.error) return { ok: false, code: 'address/geography-unavailable' }

  if (regions.data.length === 0)
    return { ok: true, region: { regionCode: null, regionName: null } }

  if (!regionCode) return { ok: false, code: 'address/region-required' }

  const region = regions.data.find((entry) => entry.code === regionCode)
  if (!region) return { ok: false, code: 'address/unknown-region' }

  return {
    ok: true,
    region: { regionCode: region.code, regionName: region.name },
  }
}
