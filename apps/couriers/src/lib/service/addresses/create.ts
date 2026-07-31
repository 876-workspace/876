import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Address, type Prisma } from '@/lib/db'
import { resolveRegion } from '@/lib/geo/resolve-region'
import {
  addressCreateParamsSchema,
  type AddressCreateParams,
} from '@/types/address'
import type { ServiceResult } from '@/types/api'

import { errFrom, err, ok } from '../result'

/**
 * Builds the persisted address columns for validated input, resolving the
 * canonical region from the platform catalog. Shared with the branch, warehouse
 * and customer-address services so every owner writes geography identically.
 */
export async function buildAddressData(
  tenantId: string,
  params: AddressCreateParams
): Promise<
  | { ok: true; data: Prisma.AddressUncheckedCreateInput }
  | { ok: false; result: ReturnType<typeof errFrom> | ReturnType<typeof err> }
> {
  const parsed = addressCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return {
      ok: false,
      result: err(parsed.error.issues[0]?.message ?? 'Invalid address.', 400),
    }

  const input = parsed.data
  const resolution = await resolveRegion(input.countryCode, input.regionCode)
  if (!resolution.ok) return { ok: false, result: errFrom(resolution.code) }

  const now = nowUnixSeconds()

  return {
    ok: true,
    data: {
      tenantId,
      name: input.name,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      countryCode: input.countryCode,
      regionCode: resolution.region.regionCode,
      regionName: resolution.region.regionName,
      postalCode: input.postalCode ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    },
  }
}

export async function create(
  tenantId: string,
  params: AddressCreateParams
): ServiceResult<Address> {
  const built = await buildAddressData(tenantId, params)
  if (!built.ok) return built.result

  try {
    return ok(await prisma.address.create({ data: built.data }))
  } catch (error) {
    console.error('[service.addresses.create]', error)
    return err('Failed to create address.', 500)
  }
}
