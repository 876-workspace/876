import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'
import type {
  RequestCategory,
  RequestPriority,
  RequestSource,
  RequestStatus,
} from '../../types/request.js'

export function list(tenantId: string) {
  return prisma.request.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.request.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function customerExists(tenantId: string, customerId: string) {
  return prisma.customerProfile.findFirst({
    where: { tenantId, id: customerId, deletedAt: null },
    select: { id: true },
  })
}

export function create(params: {
  tenantId: string
  customerId: string
  subject: string
  description?: string | null
  category?: RequestCategory
  priority?: RequestPriority
  source?: RequestSource
  assigneeId?: string | null
  createdBy: string
}) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { id: params.tenantId },
      data: { nextRequestNumber: { increment: 1 } },
      select: { nextRequestNumber: true },
    })

    return tx.request.create({
      data: {
        id: `crm_req_${randomUUID().replaceAll('-', '')}`,
        tenantId: params.tenantId,
        customerId: params.customerId,
        number: tenant.nextRequestNumber - 1,
        subject: params.subject,
        description: params.description ?? null,
        category: params.category ?? 'GENERAL',
        priority: params.priority ?? 'NORMAL',
        source: params.source ?? 'CRM',
        assigneeId: params.assigneeId ?? null,
        createdBy: params.createdBy,
      },
    })
  })
}

export function update(
  id: string,
  params: {
    subject?: string
    description?: string | null
    category?: RequestCategory
    status?: RequestStatus
    priority?: RequestPriority
    source?: RequestSource
    assigneeId?: string | null
    resolvedAt?: Date | null
    closedAt?: Date | null
  }
) {
  return prisma.request.update({ where: { id }, data: params })
}

export async function remove(params: {
  id: string
  deletedBy: string
  reason?: string | null
}) {
  if (process.env.DELETION_MODE === 'hard') {
    await prisma.request.delete({ where: { id: params.id } })
  } else {
    await prisma.request.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })
  }

  return { object: 'request' as const, id: params.id, deleted: true as const }
}
