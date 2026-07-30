import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma, type Prisma } from '@/lib/db'
import {
  warehouseCreateParamsSchema,
  type WarehouseCreateParams,
} from '@/types/warehouse'
import type { ServiceResult } from '@/types/api'
import { ok, err } from '../result'
import { isUniqueConstraintError } from '../prisma-errors'
import { addresses } from '../addresses'

export async function createWarehouse(
  tenantId: string,
  params: WarehouseCreateParams
): ServiceResult<any> {
  const parsed = warehouseCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid warehouse.', 400)

  const input = parsed.data
  const now = nowUnixSeconds()

  const addressResult = await addresses.create(tenantId, input.address)
  if (addressResult.error) return addressResult

  const address = addressResult.data!

  try {
    const warehouse = await prisma.$transaction(async (tx) => {
      const count = await tx.warehouse.count({ where: { tenantId } })
      const isPrimary = count === 0 || input.isPrimary === true

      if (isPrimary && count > 0)
        await tx.warehouse.updateMany({
          where: { tenantId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })

      return tx.warehouse.create({
        data: {
          tenantId,
          name: input.name,
          isPrimary,
          // Dual-write legacy postal columns (removed in contract PR)
          addressId: address.id,
          createdAt: now,
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    return ok(warehouse)
  } catch (error) {
    await addresses.delete(tenantId, address.id).catch(() => {})
    if (isUniqueConstraintError(error))
      return err('A warehouse with that name already exists.', 409)
    console.error('[service.warehouses.create]', error)
    return err('Failed to create warehouse.', 500)
  }
}
