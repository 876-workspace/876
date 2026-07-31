import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Address, type Prisma } from '@/lib/db'
import { resolveRegion } from '@/lib/geo/resolve-region'
import {
  addressUpdateParamsSchema,
  type AddressUpdateParams,
} from '@/types/address'
import type { ServiceResult } from '@/types/api'

import { errFrom, err, ok } from '../result'

type AddressGeography = Pick<Address, 'countryCode' | 'regionCode'>

/**
 * Builds the changed address columns for validated input.
 *
 * Geography is only re-resolved when the country or region actually changes, so
 * renaming an address or fixing a street does not erase the region snapshot a
 * migrated row carries, and does not require the platform catalog to be
 * reachable. When geography does change it is validated against the catalog
 * like a new address.
 */
export async function buildAddressUpdateData(
  current: AddressGeography,
  params: AddressUpdateParams
): Promise<
  | { ok: true; data: Prisma.AddressUncheckedUpdateInput }
  | { ok: false; result: ReturnType<typeof errFrom> | ReturnType<typeof err> }
> {
  const parsed = addressUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return {
      ok: false,
      result: err(parsed.error.issues[0]?.message ?? 'Invalid address.', 400),
    }

  const input = parsed.data
  const data: Prisma.AddressUncheckedUpdateInput = {
    updatedAt: nowUnixSeconds(),
  }

  if (input.name !== undefined) data.name = input.name
  if (input.line1 !== undefined) data.line1 = input.line1
  if (input.line2 !== undefined) data.line2 = input.line2 ?? null
  if (input.city !== undefined) data.city = input.city
  if (input.postalCode !== undefined) data.postalCode = input.postalCode ?? null
  if (input.latitude !== undefined) data.latitude = input.latitude ?? null
  if (input.longitude !== undefined) data.longitude = input.longitude ?? null
  if (input.isActive !== undefined) data.isActive = input.isActive

  const countryChanged =
    input.countryCode !== undefined && input.countryCode !== current.countryCode
  const regionChanged =
    input.regionCode !== undefined && input.regionCode !== current.regionCode

  if (countryChanged || regionChanged) {
    const countryCode = input.countryCode ?? current.countryCode
    const resolution = await resolveRegion(countryCode, input.regionCode)
    if (!resolution.ok) return { ok: false, result: errFrom(resolution.code) }

    data.countryCode = countryCode
    data.regionCode = resolution.region.regionCode
    data.regionName = resolution.region.regionName
  }

  return { ok: true, data }
}

export async function update(
  tenantId: string,
  id: string,
  params: AddressUpdateParams
): ServiceResult<Address> {
  const current = await prisma.address.findFirst({
    where: { id, tenantId },
    select: { id: true, countryCode: true, regionCode: true },
  })
  if (!current) return errFrom('address/not-found')

  const built = await buildAddressUpdateData(current, params)
  if (!built.ok) return built.result

  try {
    return ok(
      await prisma.address.update({
        where: { id: current.id },
        data: built.data,
      })
    )
  } catch (error) {
    console.error('[service.addresses.update]', error)
    return err('Failed to update address.', 500)
  }
}
