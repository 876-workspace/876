import { prisma } from '../../db/index.js'

export async function listOrganizationMilestones(
  tenantId: string,
  status?: 'open' | 'completed' | 'canceled'
) {
  return prisma.milestone.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    orderBy: [{ projectId: 'asc' }, { position: 'asc' }, { key: 'asc' }],
  })
}
