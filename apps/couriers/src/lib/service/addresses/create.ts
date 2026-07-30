import { prisma } from '@/lib/db'
import type { AddressFields, AddressView } from '@/types/address'
import { addressFieldsSchema } from '@/types/address'
import { getPlatformClient } from '@/lib/876/platform-client'
import { resolveAddressRegion } from '@/lib/geo/resolve-address-region'
import { ServiceResult, success, validationError, serviceError } from '@876/core/service'

export async function createAddress(
  tenantId: string,
  params: AddressFields
): Promise<ServiceResult<AddressView>> {
  const result = addressFieldsSchema.safeParse(params)
  if (!result.success) {
    return validationError(result.error)
  }

  const {
    name,
    line1,
    line2,
    city,
    countryCode,
    regionCode,
    postalCode,
    latitude,
    longitude,
    isActive = true,
  } = result.data

  try {
    const platform = await getPlatformClient()
    const resolvedRegion = await resolveAddressRegion(countryCode, regionCode, platform)

    const now = Math.floor(Date.now() / 1000)

    const address = await prisma.address.create({
      data: {
        tenantId,
        name,
        line1,
        line2,
        city,
        countryCode,
        regionCode: resolvedRegion.regionCode,
        regionName: resolvedRegion.regionName,
        postalCode,
        latitude,
        longitude,
        isActive,
        createdAt: now,
        updatedAt: now,
      },
    })

    return success(address)
  } catch (error: any) {
    if (error.message?.includes('unknown') || error.message?.includes('requires a region')) {
      return serviceError(422, error.message)
    }
    return serviceError(500, error.message || 'Internal error creating address')
  }
}
