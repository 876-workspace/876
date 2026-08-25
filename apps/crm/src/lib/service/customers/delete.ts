import 'server-only'

import { prisma } from '@/lib/db'
import { fail, ok, type ServiceResult } from '@/lib/service/result'

export type CustomerDeletion = { object: 'customer'; id: string; deleted: true }

export async function remove(params: {
  organizationId: string
  id: string
  deletedBy: string
  reason?: string | null
}): Promise<ServiceResult<CustomerDeletion>> {
  const current = await prisma.customerProfile.findFirst({
    where: { id: params.id, organizationId: params.organizationId, deletedAt: null },
  })
  if (!current) return fail('crm/customer-not-found', 'The CRM customer was not found.')

  if (process.env.DELETION_MODE === 'hard') {
    await prisma.customerProfile.delete({ where: { id: current.id } })
  } else {
    await prisma.customerProfile.update({
      where: { id: current.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })
  }

  return ok({ object: 'customer', id: current.id, deleted: true })
}
