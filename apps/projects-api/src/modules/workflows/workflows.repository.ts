import { prisma } from '../../db/index.js'
import type { TransitionRow } from './workflows.serializers.js'

export type CreateTransitionData = {
  id: string
  tenantId: string
  workItemTypeId: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
  createdAt: bigint
  updatedAt: bigint
}

export async function listTransitionsForType(
  tenantId: string,
  workItemTypeId: string
): Promise<TransitionRow[]> {
  const rows = await prisma.workflowTransition.findMany({
    where: {
      tenantId,
      OR: [{ workItemTypeId }, { workItemTypeId: null }],
    },
    orderBy: [{ toStateKey: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as TransitionRow[]
}

export async function replaceBlueprint(
  tenantId: string,
  workItemTypeId: string,
  transitions: CreateTransitionData[]
): Promise<TransitionRow[]> {
  return prisma.$transaction(async (tx) => {
    await tx.workflowTransition.deleteMany({
      where: { tenantId, workItemTypeId },
    })
    if (transitions.length > 0)
      await tx.workflowTransition.createMany({ data: transitions })
    const rows = await tx.workflowTransition.findMany({
      where: { tenantId, workItemTypeId },
      orderBy: [{ toStateKey: 'asc' }, { id: 'asc' }],
    })
    return rows as unknown as TransitionRow[]
  })
}
