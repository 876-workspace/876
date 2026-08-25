import 'server-only'

import { prisma, type CustomerProfileStatus } from '@/lib/db'

export function list(params: {
  organizationId: string
  status?: CustomerProfileStatus
  limit?: number
}) {
  return prisma.customerProfile.findMany({
    where: {
      organizationId: params.organizationId,
      deletedAt: null,
      ...(params.status ? { status: params.status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(params.limit ?? 50, 100),
  })
}
