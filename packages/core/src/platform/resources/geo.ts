import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformRegion } from '../types'

/** `platform.geo.*` — public reference geography data. */
export function createPlatformGeoResource(runtime: PlatformRuntime) {
  return {
    /** Lists the regions (parishes/states) for a country, e.g. `JM`. */
    listRegions(countryCode: string) {
      return platformRequest<PlatformRegion[]>(runtime, {
        method: 'GET',
        path: `/geo/countries/${encodeURIComponent(countryCode)}/regions`,
      })
    },
  }
}
