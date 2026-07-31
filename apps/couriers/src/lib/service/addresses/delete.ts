import { prisma } from '@/lib/db'
import type { DeletedAddress } from '@/types/address'
import type { ServiceResult } from '@/types/api'

import { errFrom, err, ok } from '../result'
import { isAddressInUse, usage } from './usage'

class AddressInUseError extends Error {}
class AddressNotFoundError extends Error {}

/**
 * Deletes an address that nothing references.
 *
 * The usage check and the delete run in one transaction so an address cannot be
 * attached to a branch between the two, and a linked address is refused here
 * rather than left to surface as a foreign-key violation. Deleting an address
 * never cascades into the branch, warehouse or customer that uses it.
 */
export async function del(
  tenantId: string,
  id: string
): ServiceResult<DeletedAddress> {
  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({
        where: { id, tenantId },
        select: { id: true },
      })
      if (!existing) throw new AddressNotFoundError()

      if (isAddressInUse(await usage(tenantId, id, tx)))
        throw new AddressInUseError()

      await tx.address.delete({ where: { id: existing.id } })
    })

    return ok({ id, deleted: true })
  } catch (error) {
    if (error instanceof AddressNotFoundError)
      return errFrom('address/not-found')
    if (error instanceof AddressInUseError) return errFrom('address/in-use')

    console.error('[service.addresses.delete]', error)
    return err('Failed to delete address.', 500)
  }
}
