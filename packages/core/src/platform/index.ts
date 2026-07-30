import { createPlatformGeoResource } from './resources/geo'
import type { PlatformRuntime } from './runtime'

export function create876PlatformClient(runtime: PlatformRuntime) {
  const { listCountries, listRegions } = createPlatformGeoResource(runtime)
  return {
    countries: { list: listCountries },
    regions: { list: listRegions },
  }
}
