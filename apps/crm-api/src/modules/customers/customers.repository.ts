import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export function list(tenantId: string) {
  return prisma.customerProfile.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export function retrieve(tenantId: string, id: string) {
  return prisma.customerProfile.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export function create(params: {
  tenantId: string
  billingCustomerId: string
  ownerId?: string | null
}) {
  return prisma.customerProfile.create({
    data: {
      id: `crm_cus_${randomUUID().replaceAll('-', '')}`,
      tenantId: params.tenantId,
      billingCustomerId: params.billingCustomerId,
      ownerId: params.ownerId ?? null,
    },
  })
}

export function update(
  id: string,
  params: { ownerId?: string | null; status?: 'ACTIVE' | 'INACTIVE' }
) {
  return prisma.customerProfile.update({ where: { id }, data: params })
}

export async function remove(params: {
  id: string
  deletedBy: string
  reason?: string | null
}) {
  if (process.env.DELETION_MODE === 'hard') {
    await prisma.customerProfile.delete({ where: { id: params.id } })
  } else {
    await prisma.customerProfile.update({
      where: { id: params.id },
      data: {
        deletedAt: new Date(),
        deletedBy: params.deletedBy,
        deletionReason: params.reason?.trim() || null,
      },
    })
  }

  return { object: 'customer' as const, id: params.id, deleted: true as const }
}
