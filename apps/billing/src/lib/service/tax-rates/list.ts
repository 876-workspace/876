import { prisma } from '@/lib/db'

/** Lists effective-dated tenant tax rates and their authorities. */
export function list(tenantId: string) {
  return prisma.taxRate.findMany({
    where: { tenantId },
    include: { taxAuthority: true },
    orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { name: 'asc' }],
  })
}
