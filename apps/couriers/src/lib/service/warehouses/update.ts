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
import { reportServiceFailure } from '../report'
import { ok, err, errFrom } from '../result'
import { isColdStartError, runTransaction } from '../transaction'
import { scheduleSync } from '../org-locations/sync'
import { toWarehouseView } from './view'

export async function update(
  tenantId: string,
  orgId: string,
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
      orgLocationId: true,
      isPrimary: true,
      addressId: true,
      operatingModel: true,
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
  const operatingModel = input.operatingModel ?? current.operatingModel

  try {
    const warehouse = await runTransaction('warehouses.update', async (tx) => {
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
          ...(input.operatingModel === undefined
            ? {}
            : { operatingModel: input.operatingModel }),
          ...(operatingModel === 'OWNED'
            ? { agentName: null }
            : input.agentName === undefined
              ? {}
              : { agentName: input.agentName }),
          ...(input.code === undefined ? {} : { code: input.code }),
          ...(input.mailboxPlacement === undefined
            ? {}
            : { mailboxPlacement: input.mailboxPlacement }),
          ...(input.mailboxPrefix === undefined
            ? {}
            : { mailboxPrefix: input.mailboxPrefix }),
          ...(input.instructions === undefined
            ? {}
            : { instructions: input.instructions }),
          ...(input.isActive === undefined
            ? {}
            : { isActive: input.isActive }),
          ...(input.isPrimary === undefined
            ? {}
            : { isPrimary: input.isPrimary }),
          updatedAt: now,
        },
        include: { address: true },
      })
    })

    const view = toWarehouseView(warehouse)
    scheduleSync(orgId, {
      kind: 'warehouse',
      id: view.id,
      orgLocationId: view.orgLocationId,
      name: view.name,
      phone: null,
      isActive: true,
      isDefaultForKind: view.isPrimary,
      address: view.address,
    })

    return ok(view)
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('A warehouse with that name already exists.', 409)

    if (isColdStartError(error)) {
      reportServiceFailure(error, {
        operation: 'warehouses.update',
        consequence:
          'The warehouse was not updated and the form asks the user to try again shortly.',
      })
      return errFrom('error/database-unavailable')
    }

    console.error('[service.warehouses.update]', error)
    reportServiceFailure(error, {
      operation: 'warehouses.update',
      consequence:
        'The warehouse was not updated and the form shows a generic failure.',
    })
    return err('Failed to update warehouse.', 500)
  }
}
