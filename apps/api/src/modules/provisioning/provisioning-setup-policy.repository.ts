import { prisma } from '@/db/client'

const POLICY_INCLUDE = {
  conditions: {
    orderBy: [{ priority: 'desc' as const }, { groupKey: 'asc' as const }, { field: 'asc' as const }],
  },
  entitlements: {
    orderBy: [{ targetType: 'asc' as const }, { targetKey: 'asc' as const }],
  },
} as const

export function findPolicySetupByKey(key: string) {
  return prisma.provisioningSetup.findFirst({
    where: { key },
    include: POLICY_INCLUDE,
  })
}

export function findPolicyAppBySlug(slug: string) {
  return prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true, appKind: true },
  })
}

export async function replaceSetupPolicy(params: {
  setupId: string
  conditions: Array<{
    id: string
    groupKey: string
    field: string
    operator: string
    value: string
    priority: number
    now: bigint
  }>
  entitlements: Array<{
    id: string
    targetType: string
    targetKey: string
    enabled: boolean
    now: bigint
  }>
  now: bigint
}) {
  await prisma.$transaction(async (tx) => {
    await tx.provisioningSetupCondition.deleteMany({
      where: { setupId: params.setupId },
    })
    await tx.provisioningSetupEntitlement.deleteMany({
      where: { setupId: params.setupId },
    })

    if (params.conditions.length > 0) {
      await tx.provisioningSetupCondition.createMany({
        data: params.conditions.map((condition) => ({
          id: condition.id,
          setupId: params.setupId,
          groupKey: condition.groupKey,
          field: condition.field,
          operator: condition.operator,
          value: condition.value,
          priority: condition.priority,
          createdAt: condition.now,
          updatedAt: condition.now,
        })),
      })
    }

    if (params.entitlements.length > 0) {
      await tx.provisioningSetupEntitlement.createMany({
        data: params.entitlements.map((entitlement) => ({
          id: entitlement.id,
          setupId: params.setupId,
          targetType: entitlement.targetType,
          targetKey: entitlement.targetKey,
          enabled: entitlement.enabled,
          createdAt: entitlement.now,
          updatedAt: entitlement.now,
        })),
      })
    }

    await tx.provisioningSetup.update({
      where: { id: params.setupId },
      data: { updatedAt: params.now },
    })
  })

  return prisma.provisioningSetup.findUnique({
    where: { id: params.setupId },
    include: POLICY_INCLUDE,
  })
}
