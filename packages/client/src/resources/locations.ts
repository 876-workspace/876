import type { SDK876Client } from '@876/sdk'

export function createLocationsResource(platform: SDK876Client) {
  return platform.locations
}
