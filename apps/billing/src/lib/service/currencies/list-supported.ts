import { prisma } from '@/lib/db'

/** Lists the globally supported currencies that a tenant can enable. */
export function listSupported() {
  return prisma.currency.findMany({
    where: { isActive: true },
    orderBy: { code: 'asc' },
  })
}
