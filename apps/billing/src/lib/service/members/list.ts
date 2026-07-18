import { prisma } from '@/lib/db'

export function list(tenantId: string) {
  return prisma.member.findMany({
    where: { tenantId },
    include: { role: true },
    orderBy: { createdAt: 'asc' },
  })
}
