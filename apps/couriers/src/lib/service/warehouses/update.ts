import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Prisma } from '@/lib/db'
import {
  warehouseUpdateParamsSchema,
  type WarehouseUpdateParams,
  type WarehouseView,
} from '@/types/warehouse'
import type { ServiceResult } from '@/types/api'

import { buildAddressUpdateData } from '../addresses/update'
import { isUniqueConstraintError } from '../prisma-errors'
import { ok, err } from '../result'
import { toWarehouseView } from './view'

export async function update(
  tenantId: string,
  id: string,
  params: WarehouseUpdateParams
): ServiceResult<WarehouseView> {
  const parsed = warehouseUpdateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid warehouse.', 400)

  const input = parsed.data

  const current = await prisma.warehouse.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      isPrimary: true,
      addressId: true,
      address: { select: { countryCode: true, regionCode: true } },
    },
  })
  if (!current) return err('Warehouse not found.', 404)

  let addressData: Prisma.AddressUncheckedUpdateInput | undefined
  if (input.address) {
    const built = await buildAddressUpdateData(current.address, input.address)
    if (!built.ok) return built.result
    addressData = built.data
  }

  const now = nowUnixSeconds()

  try {
    const warehouse = await prisma.$transaction(async (tx) => {
      // Unlike a branch, a warehouse's primary flag may be cleared directly —
      // promoting another warehouse is not required to demote this one.
      if (input.isPrimary === true && !current.isPrimary)
        await tx.warehouse.updateMany({
          where: { tenantId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })

      if (addressData)
        await tx.address.update({
          where: { id: current.addressId },
          data: addressData,
        })

      return tx.warehouse.update({
        where: { id: current.id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.isPrimary === undefined
            ? {}
            : { isPrimary: input.isPrimary }),
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    return ok(toWarehouseView(warehouse))
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A warehouse with that name already exists.', 409)

    console.error('[service.warehouses.update]', error)
    return err('Failed to update warehouse.', 500)
  }
}
