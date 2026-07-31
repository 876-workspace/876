import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { DeletedCustomerAddress } from '@/types/customer-address'
import type { ServiceResult } from '@/types/api'

import { isAddressInUse, usage } from '../addresses/usage'
import { ok, err } from '../result'

class NotFoundError extends Error {}

/**
 * Removes a customer's use of an address.
 *
 * The underlying address is deleted only once nothing references it — an
 * address shared with another customer, a branch or a warehouse survives. When
 * the removed row was its role's default, the oldest remaining address of that
 * role is promoted so the role never silently loses its default.
 */
export async function del(
  tenantId: string,
  id: string
): ServiceResult<DeletedCustomerAddress> {
  const now = nowUnixSeconds()

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.customerAddress.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          customerId: true,
          addressId: true,
          type: true,
          isDefault: true,
        },
      })
      if (!current) throw new NotFoundError()

      await tx.customerAddress.delete({ where: { id: current.id } })

      if (current.isDefault) {
        const successor = await tx.customerAddress.findFirst({
          where: {
            tenantId,
            customerId: current.customerId,
            type: current.type,
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        })
        if (successor)
          await tx.customerAddress.update({
            where: { id: successor.id },
            data: { isDefault: true, updatedAt: now },
          })
      }

      if (!isAddressInUse(await usage(tenantId, current.addressId, tx)))
        await tx.address.delete({ where: { id: current.addressId } })
    })

    return ok({ id, deleted: true })
  } catch (error) {
    if (error instanceof NotFoundError) return err('Address not found.', 404)

    console.error('[service.customerAddresses.delete]', error)
    return err('Failed to remove address.', 500)
  }
}
