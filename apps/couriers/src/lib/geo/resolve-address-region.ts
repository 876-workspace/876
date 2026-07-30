import type { Platform876Client } from '@876/core/platform'
import { PlatformError } from '@876/core/platform/errors'

export async function resolveAddressRegion(
  countryCode: string,
  regionCode: string | undefined,
  platform: Platform876Client
): Promise<{ regionCode: string | null; regionName: string | null }> {
  try {
    const { data: countries, error: countryError } = await platform.countries.list()
    if (countryError) throw new Error(countryError.message)

    const country = countries.find(c => c.code === countryCode)
    if (!country) {
      throw new Error(`Country ${countryCode} is unknown or disabled`)
    }

    const { data: regions, error: regionError } = await platform.regions.list(countryCode)
    if (regionError) {
      if (regionError.status === 404) {
        // Platform returned 404 for this country's regions, meaning it has none
        return { regionCode: null, regionName: null }
      }
      throw new Error(regionError.message)
    }

    if (!regions || regions.length === 0) {
      return { regionCode: null, regionName: null }
    }

    if (!regionCode) {
      throw new Error(`Country ${countryCode} requires a region code`)
    }

    const region = regions.find(r => r.code === regionCode)
    if (!region) {
      throw new Error(`Region ${regionCode} is unknown for country ${countryCode}`)
    }

    return { regionCode: region.code, regionName: region.name }
  } catch (error) {
    if (error instanceof PlatformError) {
      throw new Error(`Platform API error: ${error.message}`)
    }
    throw error
  }
}
