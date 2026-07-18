import { prisma } from '@/lib/db'

/** Lists the active currencies available to a tenant. */
export function list(tenantId: string) {
  return prisma.tenantCurrency.findMany({
    where: { tenantId, isEnabled: true },
    include: { currency: true },
    orderBy: [{ isDefault: 'desc' }, { currencyCode: 'asc' }],
  })
}
