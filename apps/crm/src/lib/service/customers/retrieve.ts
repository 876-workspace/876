import 'server-only'

import { prisma } from '@/lib/db'

export function retrieve(params: { organizationId: string; id: string }) {
  return prisma.customerProfile.findFirst({
    where: { id: params.id, organizationId: params.organizationId, deletedAt: null },
  })
}
