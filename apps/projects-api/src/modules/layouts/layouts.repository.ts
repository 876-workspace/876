import { prisma } from '../../db/index.js'

export async function listLayouts(tenantId: string) {
  return prisma.layout.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

export async function retrieveLayout(tenantId: string, id: string) {
  return prisma.layout.findFirst({
    where: { tenantId, id, deletedAt: null },
  })
}

export async function createLayout(
  data: Parameters<typeof prisma.layout.create>[0]['data']
) {
  return prisma.layout.create({ data })
}

export async function updateLayout(
  id: string,
  data: Parameters<typeof prisma.layout.update>[0]['data']
) {
  return prisma.layout.update({ where: { id }, data })
}

export async function softDeleteLayout(id: string, deletedAt: bigint) {
  return prisma.layout.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt, isDefault: false },
  })
}

export async function clearDefaultInScope(
  tenantId: string,
  entity: string,
  workItemTypeId: string | null
) {
  await prisma.layout.updateMany({
    where: {
      tenantId,
      entity,
      workItemTypeId,
      isDefault: true,
      deletedAt: null,
    },
    data: { isDefault: false },
  })
}
