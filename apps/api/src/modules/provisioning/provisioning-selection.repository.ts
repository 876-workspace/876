import { prisma } from '@/db/client'
import type { Prisma } from '@/db/generated/prisma/client'

const POLICY_SELECT = {
  id: true,
  key: true,
  isDefault: true,
  conditions: {
    orderBy: [
      { priority: 'desc' as const },
      { groupKey: 'asc' as const },
      { field: 'asc' as const },
    ],
    select: {
      id: true,
      groupKey: true,
      field: true,
      operator: true,
      value: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  entitlements: {
    orderBy: [{ targetType: 'asc' as const }, { targetKey: 'asc' as const }],
    select: {
      id: true,
      targetType: true,
      targetKey: true,
      enabled: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.ProvisioningSetupSelect

export async function listActivePublishedSelectionSetups() {
  const setups = await prisma.provisioningSetup.findMany({
    where: { status: 'active' },
    orderBy: { key: 'asc' },
    select: POLICY_SELECT,
  })
  if (setups.length === 0) return []

  const published = await prisma.provisioningManifestRevision.findMany({
    where: {
      status: 'published',
      provisioningManifest: {
        targetType: 'finance',
        targetKey: { in: setups.map((setup) => setup.key) },
      },
    },
    select: {
      provisioningManifest: { select: { targetKey: true } },
    },
  })
  const publishedKeys = new Set(
    published.map((revision) => revision.provisioningManifest.targetKey)
  )

  return setups.filter((setup) => publishedKeys.has(setup.key))
}

export async function retrievePublishedFinanceWorkspaceProperties(
  setupKey: string
) {
  return prisma.provisioningManifestRevision.findFirst({
    where: {
      status: 'published',
      provisioningManifest: { targetType: 'finance', targetKey: setupKey },
    },
    select: {
      id: true,
      revision: true,
      provisioningResources: {
        where: { resourceType: 'workspace', key: 'default' },
        take: 1,
        select: {
          provisioningProperties: {
            select: {
              key: true,
              valueType: true,
              stringValue: true,
              referenceNamespace: true,
              referenceKey: true,
            },
          },
        },
      },
    },
  })
}
