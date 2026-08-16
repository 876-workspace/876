import { platformRequest } from '../request'
import type { PlatformRuntime } from '../runtime'
import type {
  PlatformCountry,
  PlatformCurrency,
  PlatformRegion,
} from '../types'

/**
 * Geo transport composed as `$876.countries.list()` and `$876.regions.list()`.
 */
export function createPlatformGeoResource(runtime: PlatformRuntime) {
  return {
    /** Lists the currencies an organization may operate in. */
    listCurrencies() {
      return platformRequest<PlatformCurrency[]>(runtime, {
        method: 'GET',
        path: '/geo/currencies',
      })
    },
    /** Lists the countries addresses may be created in. Enabled countries only. */
    listCountries() {
      return platformRequest<PlatformCountry[]>(runtime, {
        method: 'GET',
        path: '/geo/countries',
      })
    },
    /** Lists the regions (parishes/states) for a country, e.g. `JM`. */
    listRegions(countryCode: string) {
      return platformRequest<PlatformRegion[]>(runtime, {
        method: 'GET',
        path: `/geo/countries/${encodeURIComponent(countryCode)}/regions`,
      })
    },
  }
}
