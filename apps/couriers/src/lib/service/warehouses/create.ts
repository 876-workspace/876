import { nowUnixSeconds } from '@876/core/timestamps'

import {
  warehouseCreateParamsSchema,
  type WarehouseCreateParams,
  type WarehouseView,
} from '@/types/warehouse'
import type { ServiceResult } from '@/types/api'

import { buildAddressData } from '../addresses/create'
import { isUniqueConstraintError } from '../prisma-errors'
import { reportServiceFailure } from '../report'
import { ok, err, errFrom } from '../result'
import { isColdStartError, runTransaction } from '../transaction'
import { toWarehouseView } from './view'

export async function create(
  tenantId: string,
  params: WarehouseCreateParams
): ServiceResult<WarehouseView> {
  const parsed = warehouseCreateParamsSchema.safeParse(params)
  if (!parsed.success)
    return err(parsed.error.issues[0]?.message ?? 'Invalid warehouse.', 400)

  const input = parsed.data

  const address = await buildAddressData(tenantId, {
    ...input.address,
    name: input.address.name?.trim() || input.name,
  })
  if (!address.ok) return address.result

  const now = nowUnixSeconds()

  try {
    const warehouse = await runTransaction('warehouses.create', async (tx) => {
      // A tenant's first warehouse is its primary regardless of what was
      // requested, so inbound packages always have somewhere to be received.
      const count = await tx.warehouse.count({ where: { tenantId } })
      const isPrimary = count === 0 || input.isPrimary === true

      if (isPrimary && count > 0)
        await tx.warehouse.updateMany({
          where: { tenantId, isPrimary: true },
          data: { isPrimary: false, updatedAt: now },
        })

      const created = await tx.address.create({ data: address.data })

      return tx.warehouse.create({
        data: {
          tenantId,
          addressId: created.id,
          name: input.name,
          isPrimary,
          createdAt: now,
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    return ok(toWarehouseView(warehouse))
  } catch (error) {
    // The address write is inside the transaction, so a duplicate warehouse
    // name rolls it back rather than leaving an orphan address behind.
    if (isUniqueConstraintError(error))
      return err('A warehouse with that name already exists.', 409)

    if (isColdStartError(error)) {
      reportServiceFailure(error, {
        operation: 'warehouses.create',
        consequence:
          'The warehouse was not created and the form asks the user to try again shortly.',
      })
      return errFrom('error/database-unavailable')
    }

    console.error('[service.warehouses.create]', error)
    reportServiceFailure(error, {
      operation: 'warehouses.create',
      consequence:
        'The warehouse was not created and the form shows a generic failure.',
    })
    return err('Failed to create warehouse.', 500)
  }
}
