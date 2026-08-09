import { create876PlatformClient } from '@876/core/platform'

export type ResolvedRegion = {
  regionCode: string | null
  regionName: string | null
}

export type RegionResolution =
  | { ok: true; region: ResolvedRegion }
  | {
      ok: false
      code:
        | 'address/geography-unavailable'
        | 'address/unknown-country'
        | 'address/region-required'
        | 'address/unknown-region'
    }

/** Resolves client geography through the platform's canonical catalog. */
export async function resolveRegion(
  countryCode: string,
  regionCode: string | undefined
): Promise<RegionResolution> {
  const platform = create876PlatformClient()
  const countries = await platform.countries.list()
  if (countries.error)
    return { ok: false, code: 'address/geography-unavailable' }

  if (!countries.data.some((country) => country.code === countryCode))
    return { ok: false, code: 'address/unknown-country' }

  const regions = await platform.regions.list(countryCode)
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
