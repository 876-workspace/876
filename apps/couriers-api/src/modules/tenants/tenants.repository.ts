import { prisma } from '@/db/client'

import type { TenantRow } from './tenants.serializers'

export async function findTenantById(id: string): Promise<TenantRow | null> {
  const row = await prisma.tenant.findUnique({ where: { id } })
  return row as TenantRow | null
}

export async function findTenantByOrgId(
  orgId: string
): Promise<TenantRow | null> {
  const row = await prisma.tenant.findUnique({ where: { orgId } })
  return row as TenantRow | null
}

export async function listTenants(options: {
  limit: number
  startingAfter?: string
  endingBefore?: string
}): Promise<TenantRow[]> {
  const rows = await prisma.tenant.findMany({
    take: options.limit + 1,
    where: options.startingAfter
      ? { id: { gt: options.startingAfter } }
      : options.endingBefore
        ? { id: { lt: options.endingBefore } }
        : undefined,
    orderBy: { id: options.endingBefore ? 'desc' : 'asc' },
  })
  return rows as TenantRow[]
}

export function countTenants(): Promise<number> {
  return prisma.tenant.count()
}
