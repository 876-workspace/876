import { randomUUID } from 'node:crypto'

import { prisma } from '../../db/index.js'

export function list(tenantId: string) {
  return prisma.customerProfile.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Lazily ensures a CRM profile exists for every supplied billing customer ID,
 * creating missing ones in a single bulk insert (skipping duplicates via the
 * @@unique([tenantId, billingCustomerId]) constraint).
 *
 * Returns a Map<billingCustomerId, profile> for all active profiles in the set.
 */
export async function ensureMany(
  tenantId: string,
  billingCustomerIds: string[]
): Promise<Map<string, Awaited<ReturnType<typeof list>>[number]>> {
  if (!billingCustomerIds.length)
    return new Map()

  await prisma.customerProfile.createMany({
    data: billingCustomerIds.map((billingCustomerId) => ({
      id: `crm_cus_${randomUUID().replaceAll('-', '')}`,
      tenantId,
      billingCustomerId,
      ownerId: null,
    })),
    skipDuplicates: true,
  })

  const profiles = await prisma.customerProfile.findMany({
    where: {
      tenantId,
      billingCustomerId: { in: billingCustomerIds },
      deletedAt: null,
    },
  })

  return new Map(profiles.map((p) => [p.billingCustomerId, p]))
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
