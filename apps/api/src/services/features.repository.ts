import { Prisma } from '@/db/generated/prisma/client'
import { prisma } from '@/db/client'
import { generateId } from '@/platform/ids'

/**
 * Database access for feature flags and grants.
 *
 * Only this file imports `@/db/client` — the service remains injectable for
 * tests. Prisma-specific details like `Prisma.DbNull` for nullable JSON
 * columns are contained here.
 */

export type FeatureRow = {
  id: string
  provider: string
  providerFeatureId: string | null
  providerEnvironmentId: string | null
  slug: string
  name: string
  description: string | null
  tags: string[]
  enabled: boolean
  defaultValue: boolean
  valueType: string | null
  value: unknown
  serverSideOnly: boolean
  archivedAt: bigint | null
  parentFeatureId: string | null
  providerMetadata: unknown
  consumerDefaultEnabled: boolean
  scope: string
  appId: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}

export type AppRow = {
  id: string
  name: string
  slug: string
  appKind: string
}

export type UserRow = {
  id: string
}

export type OrganizationRow = {
  id: string
}

export type OrgFeatureRow = {
  id: string
  organizationId: string
  featureId: string
  status: string
  note: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}

export type UserFeatureRow = {
  id: string
  userId: string
  featureId: string
  status: string
  note: string | null
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}

function toFeatureRow(raw: FeatureRow): FeatureRow {
  return raw
}

export async function getFeatureById(
  featureId: string
): Promise<FeatureRow | null> {
  const row = await prisma.feature.findUnique({ where: { id: featureId } })
  return row as FeatureRow | null
}

export async function getFeatureBySlug(
  slug: string
): Promise<FeatureRow | null> {
  const row = await prisma.feature.findUnique({ where: { slug } })
  return row as FeatureRow | null
}

export async function createFeature(params: {
  provider: string
  providerFeatureId: string | null
  providerEnvironmentId: string | null
  slug: string
  name: string
  description: string | null
  enabled: boolean
  scope: string
  consumerDefaultEnabled: boolean
  defaultValue: boolean
  appId: string | null
  parentFeatureId: string | null
  tags: string[]
  valueType: string | null
  value: unknown
  serverSideOnly: boolean
  providerMetadata: unknown
}): Promise<FeatureRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const valueInput =
    params.value === null || params.value === undefined
      ? Prisma.DbNull
      : (params.value as Prisma.InputJsonValue)

  const metadataInput =
    params.providerMetadata === null || params.providerMetadata === undefined
      ? Prisma.DbNull
      : (params.providerMetadata as Prisma.InputJsonValue)

  const row = await prisma.feature.create({
    data: {
      id: generateId('feature'),
      provider: params.provider,
      providerFeatureId: params.providerFeatureId,
      providerEnvironmentId: params.providerEnvironmentId,
      slug: params.slug,
      name: params.name,
      description: params.description,
      enabled: params.enabled,
      scope: params.scope,
      consumerDefaultEnabled: params.consumerDefaultEnabled,
      defaultValue: params.defaultValue,
      appId: params.appId,
      parentFeatureId: params.parentFeatureId,
      tags: params.tags,
      valueType: params.valueType,
      value: valueInput,
      serverSideOnly: params.serverSideOnly,
      providerMetadata: metadataInput,
      syncedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  })

  return row as unknown as FeatureRow
}

export async function updateFeature(
  featureId: string,
  data: Partial<{
    description: string | null
    enabled: boolean
    consumerDefaultEnabled: boolean
    scope: string
    defaultValue: boolean
    tags: string[]
    valueType: string | null
    value: unknown
    serverSideOnly: boolean
    archivedAt: bigint | null
    parentFeatureId: string | null
    appId: string | null
    syncedAt: bigint
    providerMetadata: unknown
    updatedAt: bigint
  }>
): Promise<FeatureRow> {
  const updateData: Record<string, unknown> = {}

  if ('description' in data) updateData.description = data.description
  if ('enabled' in data) updateData.enabled = data.enabled
  if ('consumerDefaultEnabled' in data)
    updateData.consumerDefaultEnabled = data.consumerDefaultEnabled
  if ('scope' in data) updateData.scope = data.scope
  if ('defaultValue' in data) updateData.defaultValue = data.defaultValue
  if ('tags' in data) updateData.tags = data.tags
  if ('valueType' in data) updateData.valueType = data.valueType
  if ('value' in data) {
    updateData.value =
      data.value === null || data.value === undefined
        ? Prisma.DbNull
        : (data.value as Prisma.InputJsonValue)
  }
  if ('serverSideOnly' in data) updateData.serverSideOnly = data.serverSideOnly
  if ('archivedAt' in data) updateData.archivedAt = data.archivedAt
  if ('parentFeatureId' in data)
    updateData.parentFeatureId = data.parentFeatureId
  if ('appId' in data) updateData.appId = data.appId
  if ('syncedAt' in data) updateData.syncedAt = data.syncedAt
  if ('providerMetadata' in data) {
    updateData.providerMetadata =
      data.providerMetadata === null || data.providerMetadata === undefined
        ? Prisma.DbNull
        : (data.providerMetadata as Prisma.InputJsonValue)
  }
  if ('updatedAt' in data) updateData.updatedAt = data.updatedAt

  const row = await prisma.feature.update({
    where: { id: featureId },
    data: updateData as never,
  })

  return row as unknown as FeatureRow
}

export async function deleteFeature(featureId: string): Promise<void> {
  await prisma.feature.delete({ where: { id: featureId } })
}

export async function listFeatures(params: {
  limit: number
  startingAfter?: string | null
  endingBefore?: string | null
  appId?: string | null
  rootOnly?: boolean
  includeTag?: string | null
  excludeTag?: string | null
}): Promise<[FeatureRow[], boolean]> {
  const where: Prisma.FeatureWhereInput = {}

  if (params.appId !== undefined && params.appId !== null)
    where.appId = params.appId
  if (params.rootOnly) where.parentFeatureId = null
  if (params.includeTag)
    (where as unknown as Record<string, unknown>).tags = {
      has: params.includeTag,
    }
  if (params.excludeTag) {
    // Exclude requires NOT semantics — Prisma arrays use NOT: { tags: { has: value } }
    const notClause = { tags: { has: params.excludeTag } }
    if ((where as unknown as Record<string, unknown>).tags) {
      // Both include and exclude: merge into AND so they coexist.
      const existingTags = (where as unknown as Record<string, unknown>).tags
      ;(where as unknown as Record<string, unknown>).AND = [
        { tags: existingTags },
        { NOT: notClause },
      ]
      delete (where as unknown as Record<string, unknown>).tags
    } else {
      ;(where as unknown as Record<string, unknown>).NOT = notClause
    }
  }

  // Cursor handling — find anchor and filter by name ordering similar to Python's
  // lower(name) ordering. Prisma sorts case-insensitively via mode: insensitive,
  // but anchor filtering uses exact lower comparison for correctness.
  const limit = params.limit
  const cursorId = params.startingAfter ?? params.endingBefore ?? null

  if (cursorId) {
    const anchor = await getFeatureById(cursorId)
    if (!anchor) return [[], false]

    const anchorLower = anchor.name.toLowerCase()

    if (params.startingAfter) {
      const rows = await prisma.feature.findMany({
        where: {
          ...where,
          OR: [
            { name: { gt: anchorLower, mode: 'insensitive' } as never },
            {
              AND: [
                { name: { equals: anchor.name, mode: 'insensitive' } as never },
                { id: { gt: anchor.id } },
              ],
            },
          ],
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      })
      return [
        (rows as unknown as FeatureRow[]).slice(0, limit),
        rows.length > limit,
      ]
    } else {
      const rows = await prisma.feature.findMany({
        where: {
          ...where,
          OR: [
            { name: { lt: anchorLower, mode: 'insensitive' } as never },
            {
              AND: [
                { name: { equals: anchor.name, mode: 'insensitive' } as never },
                { id: { lt: anchor.id } },
              ],
            },
          ],
        },
        orderBy: [{ name: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      })
      const sliced = (rows as unknown as FeatureRow[]).slice(0, limit).reverse()
      return [sliced, rows.length > limit]
    }
  }

  const rows = await prisma.feature.findMany({
    where,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: limit + 1,
  })

  return [
    (rows as unknown as FeatureRow[]).slice(0, limit),
    rows.length > limit,
  ]
}

export async function searchFeatures(params: {
  query: string
  limit: number
  appId?: string | null
  rootOnly?: boolean
  includeTag?: string | null
  excludeTag?: string | null
}): Promise<FeatureRow[]> {
  const where: Prisma.FeatureWhereInput = {
    OR: [
      { name: { contains: params.query, mode: 'insensitive' } },
      { slug: { contains: params.query, mode: 'insensitive' } },
      { description: { contains: params.query, mode: 'insensitive' } },
    ],
  }

  if (params.appId !== undefined && params.appId !== null)
    (where as unknown as Record<string, unknown>).appId = params.appId
  if (params.rootOnly)
    (where as unknown as Record<string, unknown>).parentFeatureId = null
  if (params.includeTag)
    (where as unknown as Record<string, unknown>).tags = {
      has: params.includeTag,
    }
  if (params.excludeTag) {
    const notClause = { tags: { has: params.excludeTag } }
    const existingTags = (where as unknown as Record<string, unknown>).tags
    if (existingTags) {
      ;(where as unknown as Record<string, unknown>).AND = [
        { tags: existingTags },
        { NOT: notClause },
      ]
      delete (where as unknown as Record<string, unknown>).tags
    } else {
      ;(where as unknown as Record<string, unknown>).NOT = notClause
    }
  }

  const rows = await prisma.feature.findMany({
    where,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: params.limit,
  })

  return rows as unknown as FeatureRow[]
}

export async function listOrgGrantsForFeature(
  featureId: string
): Promise<OrgFeatureRow[]> {
  return (await prisma.orgFeature.findMany({
    where: { featureId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })) as unknown as OrgFeatureRow[]
}

export async function listUserGrantsForFeature(
  featureId: string
): Promise<UserFeatureRow[]> {
  return (await prisma.userFeature.findMany({
    where: { featureId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })) as unknown as UserFeatureRow[]
}

export async function listEvaluationFeatures(
  appId: string | null
): Promise<FeatureRow[]> {
  const where: Prisma.FeatureWhereInput = { archivedAt: null }
  if (appId !== null) {
    where.OR = [{ appId }, { appId: null }]
    // Need to keep archivedAt null together with OR. Prisma's where merging
    // requires explicit AND.
    const rows = await prisma.feature.findMany({
      where: {
        archivedAt: null,
        OR: [{ appId }, { appId: null }],
      },
      orderBy: { createdAt: 'desc' },
    })
    return rows as unknown as FeatureRow[]
  }

  const rows = await prisma.feature.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return rows as unknown as FeatureRow[]
}

export async function listPlanModuleFeatureIds(
  organizationId: string,
  appId: string
): Promise<Set<string>> {
  const rows = await prisma.applicationModule.findMany({
    where: {
      appId,
      status: 'active',
      featureId: { not: null },
      planModules: {
        some: {
          product: {
            appId,
            prices: {
              some: {
                subscriptionItems: {
                  some: {
                    subscription: {
                      organizationId,
                      appId,
                      status: { in: ['active', 'trialing'] },
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as Prisma.ApplicationModuleWhereInput,
    select: { featureId: true },
  })

  return new Set(
    rows.map((r) => r.featureId).filter((id): id is string => id !== null)
  )
}

export async function listModuleFeatureIds(
  appId: string
): Promise<Set<string>> {
  const rows = await prisma.applicationModule.findMany({
    where: { appId, featureId: { not: null } },
    select: { featureId: true },
  })
  return new Set(
    rows.map((r) => r.featureId).filter((id): id is string => id !== null)
  )
}

export async function listUserFeatures(
  userId: string
): Promise<UserFeatureRow[]> {
  return (await prisma.userFeature.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })) as unknown as UserFeatureRow[]
}

export async function listOrgFeatures(
  organizationId: string
): Promise<OrgFeatureRow[]> {
  return (await prisma.orgFeature.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  })) as unknown as OrgFeatureRow[]
}

export async function getUserFeature(
  userId: string,
  featureId: string
): Promise<UserFeatureRow | null> {
  const row = await prisma.userFeature.findUnique({
    where: { userId_featureId: { userId, featureId } },
  })
  return row as unknown as UserFeatureRow | null
}

export async function getOrgFeature(
  organizationId: string,
  featureId: string
): Promise<OrgFeatureRow | null> {
  const row = await prisma.orgFeature.findUnique({
    where: { organizationId_featureId: { organizationId, featureId } },
  })
  return row as unknown as OrgFeatureRow | null
}

export async function grantUserFeature(params: {
  userId: string
  featureId: string
  enabled: boolean
  note: string | null
}): Promise<UserFeatureRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const status = params.enabled ? 'enabled' : 'disabled'
  const row = await prisma.userFeature.upsert({
    where: {
      userId_featureId: { userId: params.userId, featureId: params.featureId },
    },
    create: {
      id: generateId('userFeature'),
      userId: params.userId,
      featureId: params.featureId,
      status,
      note: params.note,
      syncedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      status,
      note: params.note,
      updatedAt: now,
    },
  })
  return row as unknown as UserFeatureRow
}

export async function revokeUserFeature(
  userId: string,
  featureId: string
): Promise<void> {
  await prisma.userFeature.delete({
    where: { userId_featureId: { userId, featureId } },
  })
}

export async function grantOrgFeature(params: {
  organizationId: string
  featureId: string
  enabled: boolean
  note: string | null
}): Promise<OrgFeatureRow> {
  const now = BigInt(Math.floor(Date.now() / 1000))
  const status = params.enabled ? 'enabled' : 'disabled'
  const row = await prisma.orgFeature.upsert({
    where: {
      organizationId_featureId: {
        organizationId: params.organizationId,
        featureId: params.featureId,
      },
    },
    create: {
      id: generateId('orgFeature'),
      organizationId: params.organizationId,
      featureId: params.featureId,
      status,
      note: params.note,
      syncedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    update: {
      status,
      note: params.note,
      syncedAt: now,
      updatedAt: now,
    },
  })
  return row as unknown as OrgFeatureRow
}

export async function revokeOrgFeature(
  organizationId: string,
  featureId: string
): Promise<void> {
  await prisma.orgFeature.delete({
    where: { organizationId_featureId: { organizationId, featureId } },
  })
}

export async function findAppById(appId: string): Promise<AppRow | null> {
  const row = await prisma.app.findUnique({ where: { id: appId } })
  return row as unknown as AppRow | null
}

export async function findAppBySlug(slug: string): Promise<AppRow | null> {
  const row = await prisma.app.findUnique({ where: { slug } })
  return row as unknown as AppRow | null
}

export async function findUserById(userId: string): Promise<UserRow | null> {
  const row = await prisma.user.findUnique({ where: { id: userId } })
  return row as unknown as UserRow | null
}

export async function findOrganizationById(
  organizationId: string
): Promise<OrganizationRow | null> {
  const row = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  return row as unknown as OrganizationRow | null
}
