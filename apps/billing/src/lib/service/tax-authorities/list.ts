import { prisma } from '@/lib/db'

/** Lists tenant tax authorities with the default first. */
export function list(tenantId: string) {
  return prisma.taxAuthority.findMany({
    where: { tenantId },
    orderBy: [{ isDefault: 'desc' }, { isActive: 'desc' }, { name: 'asc' }],
  })
}
