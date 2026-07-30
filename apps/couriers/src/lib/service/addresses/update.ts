import { prisma } from '@/lib/db'
import type { AddressFields, AddressView } from '@/types/address'
import { addressFieldsSchema } from '@/types/address'
import { getPlatformClient } from '@/lib/876/platform-client'
import { resolveAddressRegion } from '@/lib/geo/resolve-address-region'
import { ServiceResult, success, validationError, serviceError } from '@876/core/service'

export async function updateAddress(
  tenantId: string,
  id: string,
  params: Partial<AddressFields>
): Promise<ServiceResult<AddressView>> {
  const existing = await prisma.address.findUnique({
    where: { id_tenantId: { id, tenantId } }
  })
  if (!existing) return serviceError(404, 'Address not found')

  const merged = { ...existing, ...params }
  
  // Clean up undefined that might overwrite defaults incorrectly or fail validation if null
  if (merged.regionCode === null) delete merged.regionCode
  if (merged.postalCode === null) delete merged.postalCode
  if (merged.latitude === null) delete merged.latitude
  if (merged.longitude === null) delete merged.longitude
  if (merged.line2 === null) delete merged.line2

  const result = addressFieldsSchema.safeParse(merged)
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

    const address = await prisma.address.update({
      where: { id_tenantId: { id, tenantId } },
      data: {
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
        updatedAt: now,
      },
    })

    return success(address)
  } catch (error: any) {
    if (error.message?.includes('unknown') || error.message?.includes('requires a region')) {
      return serviceError(422, error.message)
    }
    return serviceError(500, error.message || 'Internal error updating address')
  }
}
