import 'server-only'

import { randomUUID } from 'node:crypto'

import { prisma, type CustomerProfileStatus } from '@/lib/db'
import { fail, ok, type ServiceResult } from '@/lib/service/result'

export async function create(params: {
  organizationId: string
  billingCustomerId: string
  ownerId?: string | null
  status?: CustomerProfileStatus
}): Promise<ServiceResult<Awaited<ReturnType<typeof prisma.customerProfile.create>>>> {
  try {
    const data = await prisma.customerProfile.create({
      data: {
        id: `crm_cus_${randomUUID().replaceAll('-', '')}`,
        organizationId: params.organizationId,
        billingCustomerId: params.billingCustomerId,
        ownerId: params.ownerId ?? null,
        status: params.status ?? 'ACTIVE',
      },
    })
    return ok(data)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') return fail('crm/customer-exists', 'This customer is already in CRM.')
    return fail('crm/customer-create-failed', 'The CRM customer could not be created.')
  }
}
