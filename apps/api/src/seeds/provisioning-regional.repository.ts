import { prisma } from '@/db/client'

export function findRegionalSetupByKey(key: string) {
  return prisma.provisioningSetup.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      countryCode: true,
      currencyCode: true,
      isDefault: true,
      conditions: { select: { id: true }, take: 1 },
      entitlements: { select: { id: true }, take: 1 },
    },
  })
}

export function createRegionalSetup(params: {
  id: string
  key: string
  name: string
  description: string
  countryCode: string | null
  currencyCode: string
  now: bigint
}) {
  return prisma.provisioningSetup.create({
    data: {
      id: params.id,
      key: params.key,
      name: params.name,
      description: params.description,
      countryCode: params.countryCode,
      currencyCode: params.currencyCode,
      status: 'active',
      isDefault: false,
      createdAt: params.now,
      updatedAt: params.now,
    },
    select: { id: true, key: true },
  })
}

export async function seedRegionalSetupPolicy(params: {
  setupId: string
  conditions: Array<{
    id: string
    groupKey: string
    field: string
    operator: string
    value: string
    priority: number
  }>
  entitlements: Array<{
    id: string
    targetType: string
    targetKey: string
    enabled: boolean
  }>
  now: bigint
}) {
  return prisma.$transaction(async (tx) => {
    const conditionCount = await tx.provisioningSetupCondition.count({
      where: { setupId: params.setupId },
    })
    const entitlementCount = await tx.provisioningSetupEntitlement.count({
      where: { setupId: params.setupId },
    })

    // Seeds fill missing day-zero policy only. Once an operator has edited a
    // policy in Console, rerunning seeds must not overwrite that decision.
    if (conditionCount === 0 && params.conditions.length > 0) {
      await tx.provisioningSetupCondition.createMany({
        data: params.conditions.map((condition) => ({
          ...condition,
          setupId: params.setupId,
          createdAt: params.now,
          updatedAt: params.now,
        })),
      })
    }

    if (entitlementCount === 0 && params.entitlements.length > 0) {
      await tx.provisioningSetupEntitlement.createMany({
        data: params.entitlements.map((entitlement) => ({
          ...entitlement,
          setupId: params.setupId,
          createdAt: params.now,
          updatedAt: params.now,
        })),
      })
    }
  })
}

export async function setRegionalFallbackDefault(
  setupId: string,
  now: bigint
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.provisioningSetup.updateMany({
      where: { isDefault: true, id: { not: setupId } },
      data: { isDefault: false, updatedAt: now },
    })
    await tx.provisioningSetup.update({
      where: { id: setupId },
      data: { isDefault: true, updatedAt: now },
    })
  })
}
