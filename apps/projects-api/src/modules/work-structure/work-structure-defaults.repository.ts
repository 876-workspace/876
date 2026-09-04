import { prisma } from '../../db/index.js'

export async function createDefaultWorkItemType(
  tenantId: string,
  data: Parameters<typeof prisma.workItemType.create>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workItemType.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workItemType.create({ data: { ...data, isDefault: true } })
  })
}

export async function updateDefaultWorkItemType(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workItemType.update>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workItemType.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workItemType.update({
      where: { id },
      data: { ...data, isDefault: true, updatedAt },
    })
  })
}

export async function createDefaultWorkflowState(
  tenantId: string,
  data: Parameters<typeof prisma.workflowState.create>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workflowState.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workflowState.create({ data: { ...data, isDefault: true } })
  })
}

export async function updateDefaultWorkflowState(
  tenantId: string,
  id: string,
  data: Parameters<typeof prisma.workflowState.update>[0]['data'],
  updatedAt: bigint
) {
  return prisma.$transaction(async (tx) => {
    await tx.workflowState.updateMany({
      where: { tenantId, archivedAt: null },
      data: { isDefault: false, updatedAt },
    })
    return tx.workflowState.update({
      where: { id },
      data: { ...data, isDefault: true, updatedAt },
    })
  })
}
