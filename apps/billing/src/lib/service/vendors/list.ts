import { prisma } from '@/lib/db'

export function listVendors(tenantId: string, status?: 'ACTIVE' | 'ARCHIVED') {
  return prisma.vendor.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
}
