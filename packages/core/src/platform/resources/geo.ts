import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type { PlatformCountry, PlatformRegion } from '../types'

export function createPlatformGeoResource(runtime: PlatformRuntime) {
  return {
    listCountries() {
      return platformRequest<PlatformCountry[]>(runtime, {
        method: 'GET',
        path: '/geo/countries',
      })
    },
    listRegions(countryCode: string) {
      return platformRequest<PlatformRegion[]>(runtime, {
        method: 'GET',
        path: `/geo/countries/${encodeURIComponent(countryCode)}/regions`,
      })
    },
  }
}
