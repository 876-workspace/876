import { prisma } from '@/db/client'
import type { Prisma } from '@/db/generated/prisma/client'
import { generateId } from '@/platform/ids'

export function findAppByIdOrSlug(value: string) {
  return prisma.app.findFirst({
    where: { OR: [{ id: value }, { slug: value }], deletedAt: null },
    select: { id: true, slug: true, name: true, status: true, appKind: true },
  })
}

export function findProvisioningSetupByKey(key: string) {
  return prisma.provisioningSetup.findUnique({
    where: { key },
    select: { id: true, key: true, status: true },
  })
}

export function findProductForApp(appId: string, slug: string) {
  return prisma.product.findFirst({
    where: { appId, slug, status: 'active', archivedAt: null },
    select: { id: true, slug: true },
  })
}

const PROFILE_INCLUDE = {
  app: { select: { id: true, slug: true } },
  conditions: { orderBy: [{ groupKey: 'asc' }, { field: 'asc' }] },
  _count: { select: { selections: true } },
} satisfies Prisma.ApplicationProvisioningProfileInclude

export function findProfile(appId: string, value: string) {
  return prisma.applicationProvisioningProfile.findFirst({
    where: {
      appId,
      OR: [{ id: value }, { key: value }],
    },
    include: PROFILE_INCLUDE,
  })
}

export function findProfileById(profileId: string) {
  return prisma.applicationProvisioningProfile.findUnique({
    where: { id: profileId },
    include: PROFILE_INCLUDE,
  })
}

export function findDefaultProfile(appId: string) {
  return prisma.applicationProvisioningProfile.findFirst({
    where: { appId, isDefault: true },
    include: PROFILE_INCLUDE,
  })
}

export function listProfiles(appId: string) {
  return prisma.applicationProvisioningProfile.findMany({
    where: { appId },
    orderBy: [{ isDefault: 'desc' }, { key: 'asc' }],
    include: PROFILE_INCLUDE,
  })
}

export function listActiveProfiles(appId: string) {
  return prisma.applicationProvisioningProfile.findMany({
    where: { appId, status: 'active' },
    orderBy: { key: 'asc' },
    include: {
      app: { select: { id: true, slug: true } },
      conditions: { orderBy: [{ groupKey: 'asc' }, { field: 'asc' }] },
    },
  })
}

export async function ensureDefaultProfile(appId: string, now: bigint) {
  const existing = await findDefaultProfile(appId)
  if (existing) return existing

  try {
    await prisma.applicationProvisioningProfile.create({
      data: {
        id: generateId('applicationProvisioningProfile'),
        appId,
        key: 'default',
        name: 'Default',
        description: 'Default provisioning profile.',
        status: 'active',
        isDefault: true,
        manifestTargetKey: appId,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch {
    // A concurrent request may have created the unique default first.
  }

  const created = await findDefaultProfile(appId)
  if (!created) throw new Error('Failed to create the default app profile')
  return created
}

export function createProfile(params: {
  id: string
  appId: string
  key: string
  name: string
  description: string | null
  isDefault: boolean
  status: 'draft' | 'active'
  manifestTargetKey: string
  now: bigint
}) {
  return prisma.applicationProvisioningProfile.create({
    data: {
      id: params.id,
      appId: params.appId,
      key: params.key,
      name: params.name,
      description: params.description,
      isDefault: params.isDefault,
      status: params.status,
      manifestTargetKey: params.manifestTargetKey,
      createdAt: params.now,
      updatedAt: params.now,
    },
  })
}

export function updateProfile(
  profileId: string,
  data: {
    name?: string
    description?: string | null
    status?: 'draft' | 'active' | 'archived'
    updatedAt: bigint
  }
) {
  return prisma.applicationProvisioningProfile.update({
    where: { id: profileId },
    data,
  })
}

/**
 * Promote one profile to be the app default while preserving the legacy
 * `application/<appId>` manifest target for generic callers.
 *
 * Profile selections reference profile IDs, not manifest target keys, so
 * swapping the target keys does not reroute any existing organization.
 */
export async function makeDefaultProfile(params: {
  appId: string
  profileId: string
  now: bigint
}) {
  await prisma.$transaction(async (tx) => {
    const [currentDefault, nextDefault] = await Promise.all([
      tx.applicationProvisioningProfile.findFirst({
        where: { appId: params.appId, isDefault: true },
        select: { id: true, manifestTargetKey: true },
      }),
      tx.applicationProvisioningProfile.findFirst({
        where: { id: params.profileId, appId: params.appId },
        select: { id: true, manifestTargetKey: true },
      }),
    ])

    if (!nextDefault)
      throw new Error('Application provisioning profile was not found')

    if (currentDefault?.id === nextDefault.id) {
      await tx.applicationProvisioningProfile.update({
        where: { id: nextDefault.id },
        data: { status: 'active', updatedAt: params.now },
      })
      return
    }

    const oldDefaultTarget = currentDefault?.manifestTargetKey ?? params.appId
    const nextTarget = nextDefault.manifestTargetKey

    if (currentDefault) {
      const temporaryTarget = generateId('applicationProvisioningProfile')
      const [oldManifest, nextManifest] = await Promise.all([
        tx.provisioningManifest.findFirst({
          where: { targetType: 'application', targetKey: oldDefaultTarget },
          select: { id: true },
        }),
        tx.provisioningManifest.findFirst({
          where: { targetType: 'application', targetKey: nextTarget },
          select: { id: true },
        }),
      ])

      await tx.applicationProvisioningProfile.update({
        where: { id: currentDefault.id },
        data: {
          isDefault: false,
          manifestTargetKey: temporaryTarget,
          updatedAt: params.now,
        },
      })
      if (oldManifest)
        await tx.provisioningManifest.update({
          where: { id: oldManifest.id },
          data: { targetKey: temporaryTarget, updatedAt: params.now },
        })

      await tx.applicationProvisioningProfile.update({
        where: { id: nextDefault.id },
        data: {
          isDefault: true,
          status: 'active',
          manifestTargetKey: params.appId,
          updatedAt: params.now,
        },
      })
      if (nextManifest)
        await tx.provisioningManifest.update({
          where: { id: nextManifest.id },
          data: { targetKey: params.appId, updatedAt: params.now },
        })

      await tx.applicationProvisioningProfile.update({
        where: { id: currentDefault.id },
        data: { manifestTargetKey: nextTarget, updatedAt: params.now },
      })
      if (oldManifest)
        await tx.provisioningManifest.update({
          where: { id: oldManifest.id },
          data: { targetKey: nextTarget, updatedAt: params.now },
        })
      return
    }

    await tx.applicationProvisioningProfile.update({
      where: { id: nextDefault.id },
      data: {
        isDefault: true,
        status: 'active',
        manifestTargetKey: params.appId,
        updatedAt: params.now,
      },
    })
    if (nextTarget !== params.appId) {
      const manifest = await tx.provisioningManifest.findFirst({
        where: { targetType: 'application', targetKey: nextTarget },
        select: { id: true },
      })
      if (manifest)
        await tx.provisioningManifest.update({
          where: { id: manifest.id },
          data: { targetKey: params.appId, updatedAt: params.now },
        })
    }
  })
}

export async function replaceConditions(
  profileId: string,
  conditions: Array<{
    id: string
    groupKey: string
    field: string
    operator: 'equals'
    value: string
    priority: number
  }>,
  now: bigint
) {
  await prisma.$transaction(async (tx) => {
    await tx.applicationProvisioningProfileCondition.deleteMany({
      where: { profileId },
    })
    if (conditions.length > 0)
      await tx.applicationProvisioningProfileCondition.createMany({
        data: conditions.map((condition) => ({
          ...condition,
          profileId,
          createdAt: now,
          updatedAt: now,
        })),
      })

    await tx.applicationProvisioningProfile.update({
      where: { id: profileId },
      data: { updatedAt: now },
    })
  })
}

export function findManifestState(manifestTargetKeys: string[]) {
  if (manifestTargetKeys.length === 0) return Promise.resolve([])

  return prisma.provisioningManifestRevision.findMany({
    where: {
      status: { in: ['draft', 'published'] },
      provisioningManifest: {
        targetType: 'application',
        targetKey: { in: manifestTargetKeys },
      },
    },
    select: {
      revision: true,
      status: true,
      provisioningManifest: {
        select: { id: true, targetKey: true },
      },
    },
  })
}

export function findPublishedRevision(manifestTargetKey: string) {
  return prisma.provisioningManifestRevision.findFirst({
    where: {
      status: 'published',
      provisioningManifest: {
        targetType: 'application',
        targetKey: manifestTargetKey,
      },
    },
    include: {
      provisioningResources: { include: { provisioningProperties: true } },
      provisioningSteps: true,
    },
  })
}

export function findPersistedSelection(organizationId: string, appId: string) {
  return prisma.organizationApplicationProvisioning.findUnique({
    where: {
      organizationId_appId: { organizationId, appId },
    },
    include: {
      app: { select: { id: true, slug: true } },
      profile: { select: { id: true, key: true, manifestTargetKey: true } },
    },
  })
}

export async function persistSelection(params: {
  id: string
  organizationId: string
  appId: string
  profileId: string
  selectionType: 'policy' | 'default' | 'backfill'
  matchGroupKey: string | null
  matchPriority: number | null
  matchedFields: string[]
  selectedAt: bigint
}): Promise<boolean> {
  try {
    await prisma.organizationApplicationProvisioning.create({
      data: {
        id: params.id,
        organizationId: params.organizationId,
        appId: params.appId,
        profileId: params.profileId,
        selectionType: params.selectionType,
        matchGroupKey: params.matchGroupKey,
        matchPriority: params.matchPriority,
        matchedFields: params.matchedFields,
        selectedAt: params.selectedAt,
        createdAt: params.selectedAt,
        updatedAt: params.selectedAt,
      },
    })
    return true
  } catch {
    const existing = await findPersistedSelection(
      params.organizationId,
      params.appId
    )
    if (existing) return false
    throw new Error('Failed to persist application provisioning selection')
  }
}

export function findOrganizationSelectionContext(
  organizationId: string,
  appId: string
) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      provisioningSetupKey: true,
      countryCode: true,
      region: { select: { code: true } },
      subscriptions: {
        where: { appId, status: 'active' },
        take: 1,
        select: {
          subscriptionItems: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: {
              price: {
                select: { product: { select: { slug: true } } },
              },
            },
          },
        },
      },
    },
  })
}

export function countActiveDefaults(appId: string) {
  return prisma.applicationProvisioningProfile.count({
    where: { appId, status: 'active', isDefault: true },
  })
}
