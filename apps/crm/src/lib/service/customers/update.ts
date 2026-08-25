import 'server-only'

import { prisma, type CustomerProfileStatus } from '@/lib/db'
import { fail, ok, type ServiceResult } from '@/lib/service/result'

export async function update(params: {
  organizationId: string
  id: string
  ownerId?: string | null
  status?: CustomerProfileStatus
}): Promise<ServiceResult<Awaited<ReturnType<typeof prisma.customerProfile.update>>>> {
  const current = await prisma.customerProfile.findFirst({
    where: { id: params.id, organizationId: params.organizationId, deletedAt: null },
  })
  if (!current) return fail('crm/customer-not-found', 'The CRM customer was not found.')

  try {
    return ok(
      await prisma.customerProfile.update({
        where: { id: current.id },
        data: {
          ...(params.ownerId !== undefined ? { ownerId: params.ownerId } : {}),
          ...(params.status ? { status: params.status } : {}),
        },
      })
    )
  } catch {
    return fail('crm/customer-update-failed', 'The CRM customer could not be updated.')
  }
}
