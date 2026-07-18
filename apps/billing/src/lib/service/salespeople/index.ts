import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type {
  SalespersonCreateParams,
  SalespersonUpdateParams,
} from '@/types/salesperson'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

async function create(
  tenantId: string,
  params: SalespersonCreateParams
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()

  try {
    const salesperson = await prisma.salesperson.create({
      data: {
        id: generateId('Salesperson'),
        tenantId,
        name: params.name,
        email: params.email ?? null,
        externalReference: params.externalReference ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    })

    return ok({ id: salesperson.id })
  } catch (error) {
    console.error('[billing.service.salespeople.create]', error)
    return err('Failed to create the salesperson.', 500)
  }
}

async function update(
  tenantId: string,
  salespersonId: string,
  params: SalespersonUpdateParams
): ServiceResult<{ id: string }> {
  const result = await prisma.salesperson.updateMany({
    where: { id: salespersonId, tenantId },
    data: { ...params, updatedAt: nowUnixSeconds() },
  })
  if (result.count === 0) return err('Salesperson not found.', 404)

  return ok({ id: salespersonId })
}

export const salespeople = {
  create,
  list(tenantId: string) {
    return prisma.salesperson.findMany({
      where: { tenantId },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    })
  },
  update,
}
