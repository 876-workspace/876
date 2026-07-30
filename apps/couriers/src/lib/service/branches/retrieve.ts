import { prisma } from '@/lib/db'

export function retrieve(params: { tenantId: string; id: string }) {
  return prisma.branch.findFirst({
    where: { id: params.id, tenantId: params.tenantId },
    include: { address: true },
  })
}
