import { prisma } from '@/db/client'
import { Prisma } from '@/db/generated/prisma/client'

export type FeatureFlagSyncRow = {
  id: string
  provider: string
  providerFeatureId: string | null
  slug: string
  enabled: boolean
  providerMetadata: unknown
}

export async function listFeatureFlagsForSync(): Promise<FeatureFlagSyncRow[]> {
  const rows = await prisma.feature.findMany({
    select: {
      id: true,
      provider: true,
      providerFeatureId: true,
      slug: true,
      enabled: true,
      providerMetadata: true,
    },
  })

  return rows as FeatureFlagSyncRow[]
}

export async function updateFeatureFlagForSync(
  featureId: string,
  data: {
    provider: string
    providerFeatureId: string
    enabled: boolean
    providerMetadata: Record<string, unknown>
    syncedAt: bigint
    updatedAt: bigint
  }
): Promise<void> {
  await prisma.feature.update({
    where: { id: featureId },
    data: {
      ...data,
      providerMetadata: data.providerMetadata as Prisma.InputJsonValue,
    },
  })
}
