import { Prisma } from '@/db/generated/prisma/client'
import { prisma } from '@/db/client'

export type FeatureFlagMigrationArchiveRow = {
  id: string
  sourceProvider: string
  targetProvider: string
  checksum: string
  status: string
  counts: unknown
  snapshot: unknown
  result: unknown
  createdAt: bigint
  completedAt: bigint | null
}

export async function findArchiveByChecksum(
  checksum: string
): Promise<FeatureFlagMigrationArchiveRow | null> {
  const row = await prisma.featureFlagMigrationArchive.findUnique({
    where: { checksum },
  })
  return row as unknown as FeatureFlagMigrationArchiveRow | null
}

export async function findCompletedArchive(): Promise<FeatureFlagMigrationArchiveRow | null> {
  const row = await prisma.featureFlagMigrationArchive.findFirst({
    where: { status: 'completed' },
  })
  return row as unknown as FeatureFlagMigrationArchiveRow | null
}

export async function findLatestArchive(): Promise<FeatureFlagMigrationArchiveRow | null> {
  const row = await prisma.featureFlagMigrationArchive.findFirst({
    orderBy: { createdAt: 'desc' },
  })
  return row as unknown as FeatureFlagMigrationArchiveRow | null
}

export async function createArchive(params: {
  id: string
  sourceProvider: string
  targetProvider: string
  checksum: string
  status: string
  counts: unknown
  snapshot: unknown
  result: unknown
  createdAt: bigint
  completedAt: bigint | null
}): Promise<FeatureFlagMigrationArchiveRow> {
  const row = await prisma.featureFlagMigrationArchive.create({
    data: {
      id: params.id,
      sourceProvider: params.sourceProvider,
      targetProvider: params.targetProvider,
      checksum: params.checksum,
      status: params.status,
      counts: params.counts as Prisma.InputJsonValue,
      snapshot: params.snapshot as Prisma.InputJsonValue,
      result: params.result
        ? (params.result as Prisma.InputJsonValue)
        : Prisma.DbNull,
      createdAt: params.createdAt,
      completedAt: params.completedAt,
    },
  })
  return row as unknown as FeatureFlagMigrationArchiveRow
}

export async function updateArchive(
  archiveId: string,
  data: Partial<{
    status: string
    result: unknown
    completedAt: bigint | null
  }>
): Promise<FeatureFlagMigrationArchiveRow> {
  const updateData: Record<string, unknown> = {}
  if ('status' in data) updateData.status = data.status
  if ('result' in data) {
    updateData.result =
      data.result === null || data.result === undefined
        ? Prisma.DbNull
        : (data.result as Prisma.InputJsonValue)
  }
  if ('completedAt' in data) updateData.completedAt = data.completedAt

  const row = await prisma.featureFlagMigrationArchive.update({
    where: { id: archiveId },
    data: updateData as never,
  })
  return row as unknown as FeatureFlagMigrationArchiveRow
}

export async function listFeatures(): Promise<
  Array<{
    id: string
    slug: string
    name: string
    description: string | null
    enabled: boolean
    provider: string
    providerFeatureId: string | null
    providerEnvironmentId: string | null
    providerMetadata: unknown
  }>
> {
  const rows = await prisma.feature.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      enabled: true,
      provider: true,
      providerFeatureId: true,
      providerEnvironmentId: true,
      providerMetadata: true,
    },
  })
  return rows as unknown as Array<{
    id: string
    slug: string
    name: string
    description: string | null
    enabled: boolean
    provider: string
    providerFeatureId: string | null
    providerEnvironmentId: string | null
    providerMetadata: unknown
  }>
}

export async function updateFeatureProvider(
  featureId: string,
  params: {
    provider: string
    providerFeatureId: string
    providerEnvironmentId: string
    providerMetadata: unknown
    syncedAt: bigint
    updatedAt: bigint
  }
): Promise<void> {
  await prisma.feature.update({
    where: { id: featureId },
    data: {
      provider: params.provider,
      providerFeatureId: params.providerFeatureId,
      providerEnvironmentId: params.providerEnvironmentId,
      providerMetadata: params.providerMetadata as Prisma.InputJsonValue,
      syncedAt: params.syncedAt,
      updatedAt: params.updatedAt,
    },
  })
}

export async function tableRows(
  tableName: string
): Promise<Record<string, unknown>[]> {
  // Table name is controlled by our own code; validate to avoid injection.
  if (!/^[a-z_]+$/.test(tableName))
    throw new Error(`Invalid table name: ${tableName}`)
  const rows = await prisma.$queryRawUnsafe<Array<{ data: unknown }>>(
    `SELECT to_jsonb(row_data) AS data FROM "${tableName}" AS row_data ORDER BY id`
  )
  return rows
    .map((row) => row.data as Record<string, unknown> | null)
    .filter(
      (data): data is Record<string, unknown> =>
        data !== null && typeof data === 'object'
    )
}

export async function legacyUserIdentityRows(): Promise<
  Record<string, unknown>[]
> {
  const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`
  const columnNames = new Set(columns.map((row) => row.column_name))
  const legacyColumns = [
    'flagsmith_identity_id',
    'flagsmith_identifier',
    'flagsmith_environment_id',
    'flagsmith_identity_synced_at',
  ]
  if (!legacyColumns.every((column) => columnNames.has(column))) {
    return []
  }
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT id, flagsmith_identity_id, flagsmith_identifier, flagsmith_environment_id, flagsmith_identity_synced_at
      FROM users ORDER BY id`
  return rows.map((row) => ({ ...row }))
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {}
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[key] = (val as Record<string, unknown>)[key]
      }
      return sorted
    }
    return val
  })
}

export function normalizeJson(value: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => (val === undefined ? null : val))
  ) as Record<string, unknown>
}

/** A specific archive by id; `null` when it does not exist. */
export function findArchiveById(archiveId: string) {
  return prisma.featureFlagMigrationArchive.findUnique({
    where: { id: archiveId },
  })
}
