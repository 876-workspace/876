import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import type { ServiceResult } from '@/types/api'
import type { DeletedCustomer } from '@/types/customer'

import { errFrom, ok } from '../result'

export async function deleteCustomer(
  tenantId: string,
  id: string,
  deletedBy: string,
  deletionReason?: string
): ServiceResult<DeletedCustomer> {
  const customer = await prisma.courierCustomerProfile.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!customer) return errFrom('customer/not-found')
  // Registry customers can belong to other 876 apps, so deleting a courier
  // profile must never archive or delete the shared registry party.
  await prisma.courierCustomerProfile.update({
    where: { id: customer.id },
    data: {
      deletedAt: nowUnixSeconds(),
      deletedBy,
      deletionReason: deletionReason ?? null,
    },
  })
  return ok({ id, deleted: true })
}
