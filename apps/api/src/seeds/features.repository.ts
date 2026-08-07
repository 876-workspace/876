import { Prisma } from '@/db/generated/prisma/client'
import { prisma } from '@/db/client'

export type FeatureSeedRow = {
  id: string
  slug: string
  name: string
  description: string | null
  enabled: boolean
  defaultValue: boolean
  provider: string
  providerFeatureId: string | null
  providerEnvironmentId: string | null
  providerMetadata: unknown
  scope: string
  consumerDefaultEnabled: boolean
  appId: string | null
  parentFeatureId: string | null
  tags: string[]
  serverSideOnly: boolean
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}

export async function findAppBySlug(
  slug: string
): Promise<{ id: string; slug: string } | null> {
  return prisma.app.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })
}

export async function findFeatureBySlug(
  slug: string
): Promise<FeatureSeedRow | null> {
  const row = await prisma.feature.findUnique({ where: { slug } })
  return row as unknown as FeatureSeedRow | null
}

export async function findFeatureById(
  id: string
): Promise<FeatureSeedRow | null> {
  const row = await prisma.feature.findUnique({ where: { id } })
  return row as unknown as FeatureSeedRow | null
}

export async function findAnyLegacyFeature(): Promise<FeatureSeedRow | null> {
  const row = await prisma.feature.findFirst({
    where: { provider: { not: 'posthog' } },
  })
  return row as unknown as FeatureSeedRow | null
}

export async function findCompletedArchive(): Promise<{ id: string } | null> {
  return prisma.featureFlagMigrationArchive.findFirst({
    where: { status: 'completed' },
    select: { id: true },
  })
}

export async function createFeature(params: {
  id: string
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
  serverSideOnly: boolean
  providerMetadata: unknown
  syncedAt: bigint
  createdAt: bigint
  updatedAt: bigint
}): Promise<FeatureSeedRow> {
  const metadataInput =
    params.providerMetadata === null || params.providerMetadata === undefined
      ? Prisma.DbNull
      : (params.providerMetadata as Prisma.InputJsonValue)

  const row = await prisma.feature.create({
    data: {
      id: params.id,
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
      serverSideOnly: params.serverSideOnly,
      providerMetadata: metadataInput,
      syncedAt: params.syncedAt,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt,
    },
  })
  return row as unknown as FeatureSeedRow
}

export async function updateFeature(
  featureId: string,
  data: Partial<{
    provider: string
    providerFeatureId: string | null
    providerEnvironmentId: string | null
    providerMetadata: unknown
    slug: string
    name: string
    description: string | null
    enabled: boolean
    defaultValue: boolean
    appId: string | null
    parentFeatureId: string | null
    tags: string[]
    syncedAt: bigint
    updatedAt: bigint
  }>
): Promise<FeatureSeedRow> {
  const updateData: Record<string, unknown> = {}
  if ('provider' in data) updateData.provider = data.provider
  if ('providerFeatureId' in data)
    updateData.providerFeatureId = data.providerFeatureId
  if ('providerEnvironmentId' in data)
    updateData.providerEnvironmentId = data.providerEnvironmentId
  if ('providerMetadata' in data) {
    updateData.providerMetadata =
      data.providerMetadata === null || data.providerMetadata === undefined
        ? Prisma.DbNull
        : (data.providerMetadata as Prisma.InputJsonValue)
  }
  if ('slug' in data) updateData.slug = data.slug
  if ('name' in data) updateData.name = data.name
  if ('description' in data) updateData.description = data.description
  if ('enabled' in data) updateData.enabled = data.enabled
  if ('defaultValue' in data) updateData.defaultValue = data.defaultValue
  if ('appId' in data) updateData.appId = data.appId
  if ('parentFeatureId' in data)
    updateData.parentFeatureId = data.parentFeatureId
  if ('tags' in data) updateData.tags = data.tags
  if ('syncedAt' in data) updateData.syncedAt = data.syncedAt
  if ('updatedAt' in data) updateData.updatedAt = data.updatedAt

  const row = await prisma.feature.update({
    where: { id: featureId },
    data: updateData as never,
  })
  return row as unknown as FeatureSeedRow
}

export async function listFeatures(): Promise<FeatureSeedRow[]> {
  const rows = await prisma.feature.findMany()
  return rows as unknown as FeatureSeedRow[]
}
