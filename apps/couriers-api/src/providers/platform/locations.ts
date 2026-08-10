import {
  create876PlatformClient,
  type PlatformOrgLocationCreateParams,
  type PlatformOrgLocationUpdateParams,
} from '@876/core/platform'

import { getSettings } from '@/config'
import { getRequestId } from '@/platform/logger'

function platformClient() {
  const settings = getSettings()
  return create876PlatformClient({
    apiKey: settings.api876Key,
    internalKey: settings.internalKey,
    requestId: getRequestId() || undefined,
  })
}

export async function resolvePlatformRegionId(
  countryCode: string,
  regionCode: string | null
): Promise<string | null> {
  if (!regionCode) return null

  const regions = await platformClient().regions.list(countryCode)
  if (regions.error) return null

  return regions.data.find((region) => region.code === regionCode)?.id ?? null
}

export function createOrganizationLocation(
  orgId: string,
  params: PlatformOrgLocationCreateParams
) {
  return platformClient().locations.create(orgId, params)
}

export function listOrganizationLocations(orgId: string) {
  return platformClient().locations.list(orgId)
}

export function updateOrganizationLocation(
  orgId: string,
  locationId: string,
  params: PlatformOrgLocationUpdateParams
) {
  return platformClient().locations.update(orgId, locationId, params)
}
