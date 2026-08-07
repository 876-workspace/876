import { createHash } from 'node:crypto'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getPostHogClient } from '@/providers/posthog/client'

import {
  createArchive,
  findArchiveByChecksum,
  findCompletedArchive,
  findArchiveById,
  findLatestArchive,
  legacyUserIdentityRows,
  listFeatures,
  tableRows,
  updateArchive,
  updateFeatureProvider,
} from './feature-flag-migration.repository'

const log = getLogger('feature-flag-migration')

export type FeatureFlagMigrationSummary = {
  archiveId: string
  checksum: string
  status: string
  mappedFeatures: number
  configured: boolean
}

function canonicalJson(value: unknown): string {
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

function _normalizeJson(value: unknown): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') return String(val)
      if (
        val !== null &&
        typeof val === 'object' &&
        typeof (val as { toString?: () => string })?.toString === 'function'
      ) {
        // default=str in Python handles non-serializable types; for our snapshot
        // all values are JSON-serializable, so passthrough.
      }
      return val
    })
  ) as Record<string, unknown>
}

export async function captureLegacyFeatureSnapshot(): Promise<{
  archiveId: string
  checksum: string
  created: boolean
}> {
  const features = await tableRows('features')
  const userGrants = await tableRows('user_features')
  const orgGrants = await tableRows('org_features')
  const userIdentities = await legacyUserIdentityRows()

  const snapshotData = {
    schema_version: 1,
    legacy_provider: { name: 'removed' },
    local: {
      features,
      user_features: userGrants,
      org_features: orgGrants,
      user_identities: userIdentities,
    },
  }

  const canonical = canonicalJson(snapshotData)
  const checksum = createHash('sha256').update(canonical).digest('hex')

  const existing = await findArchiveByChecksum(checksum)
  if (existing) {
    return { archiveId: existing.id, checksum, created: false }
  }

  const counts = {
    local_features: features.length,
    local_user_grants: userGrants.length,
    local_org_grants: orgGrants.length,
    local_user_identities: userIdentities.length,
  }

  const snapshot = {
    ...snapshotData,
    captured_at: nowUnixSeconds(),
  }

  // Normalize via JSON round-trip with default=str — handles BigInt etc.
  const normalizedSnapshot = _normalizeJson(snapshot)

  const archiveId = generateId('featureFlagMigrationArchive')
  await createArchive({
    id: archiveId,
    sourceProvider: 'legacy',
    targetProvider: 'posthog',
    checksum,
    status: 'captured',
    counts,
    snapshot: normalizedSnapshot,
    result: null,
    createdAt: BigInt(nowUnixSeconds()),
    completedAt: null,
  })

  log.info(
    { archive_id: archiveId, checksum, counts },
    'feature_flag_migration.captured'
  )

  return { archiveId, checksum, created: true }
}

export async function importSnapshotToPosthog(
  archiveId?: string | null
): Promise<FeatureFlagMigrationSummary> {
  const settings = getSettings()
  if (
    !settings.posthog.personalApiKey ||
    !settings.posthog.projectId ||
    !settings.posthog.host
  ) {
    return {
      archiveId: archiveId ?? '',
      checksum: '',
      status: 'skipped',
      mappedFeatures: 0,
      configured: false,
    }
  }

  let archive: Awaited<ReturnType<typeof findLatestArchive>> = null
  // A named archive wins; without one, the most recent capture is replayed.
  if (archiveId) {
    archive = (await findArchiveById(archiveId)) as unknown as typeof archive
  }
  if (!archive) {
    archive = await findLatestArchive()
  }
  if (!archive) {
    throw new Error(
      'No feature flag migration archive found. Run capture first.'
    )
  }

  const posthog = getPostHogClient(settings)
  const existingFlagsRaw = await posthog.listFeatures()
  const existingFlags = new Map<string, Record<string, unknown>>()
  for (const flag of existingFlagsRaw) {
    const key = String(flag['key'] ?? '')
    if (key) existingFlags.set(key, flag)
  }

  const localFeatures = await listFeatures()
  const snapshot = archive.snapshot as Record<string, unknown>
  const snapshotLocal =
    (snapshot['local'] as Record<string, unknown> | undefined) ?? {}
  const snapshotFeatures =
    (snapshotLocal['features'] as Array<Record<string, unknown>> | undefined) ??
    []
  const archivedFeatures = new Map<string, Record<string, unknown>>()
  for (const row of snapshotFeatures) {
    const id = String(row['id'] ?? '')
    if (id) archivedFeatures.set(id, row)
  }

  const mappings: Array<{
    feature_id: string
    slug: string
    source_provider_feature_id: string
    posthog_feature_id: string
  }> = []

  for (const feature of localFeatures) {
    let providerFlag = existingFlags.get(feature.slug) ?? null
    if (!providerFlag) {
      providerFlag = await posthog.createFeature({
        key: feature.slug,
        name: feature.name,
        description: feature.description,
        enabled: feature.enabled,
      })
      existingFlags.set(feature.slug, providerFlag)
    }

    const providerId = String(providerFlag['id'])
    const archived = archivedFeatures.get(feature.id)
    const sourceProviderFeatureId = String(
      archived?.['provider_feature_id'] ?? archived?.['providerFeatureId'] ?? ''
    )

    mappings.push({
      feature_id: feature.id,
      slug: feature.slug,
      source_provider_feature_id: sourceProviderFeatureId,
      posthog_feature_id: providerId,
    })
  }

  if (mappings.length !== localFeatures.length) {
    throw new Error('PostHog migration did not map every local feature.')
  }

  const now = BigInt(nowUnixSeconds())
  for (const feature of localFeatures) {
    const providerFlag = existingFlags.get(feature.slug)
    if (!providerFlag) continue
    await updateFeatureProvider(feature.id, {
      provider: 'posthog',
      providerFeatureId: String(providerFlag['id']),
      providerEnvironmentId: String(settings.posthog.projectId),
      providerMetadata: providerFlag,
      syncedAt: now,
      updatedAt: now,
    })
  }

  const result = {
    archive_id: archive.id,
    checksum: archive.checksum,
    mapped_features: mappings.length,
    mappings,
  }

  await updateArchive(archive.id, {
    status: 'completed',
    result,
    completedAt: now,
  })

  log.info(
    { archive_id: archive.id, mapped_features: mappings.length },
    'feature_flag_migration.completed'
  )

  return {
    archiveId: archive.id,
    checksum: archive.checksum,
    status: 'completed',
    mappedFeatures: mappings.length,
    configured: true,
  }
}

export async function runFeatureFlagMigrationOnce(): Promise<FeatureFlagMigrationSummary> {
  const completed = await findCompletedArchive()
  if (completed) {
    return {
      archiveId: completed.id,
      checksum: completed.checksum,
      status: completed.status,
      mappedFeatures: 0,
      configured: true,
    }
  }

  const { archiveId } = await captureLegacyFeatureSnapshot()
  return importSnapshotToPosthog(archiveId)
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise((resolve) => setTimeout(resolve, ms))
  if (signal.aborted) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      resolve()
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export async function runFeatureFlagMigrationWorker(options?: {
  signal?: AbortSignal
  intervalMs?: number
}): Promise<void> {
  const intervalMs = options?.intervalMs ?? 60_000

  while (!options?.signal?.aborted) {
    try {
      await runFeatureFlagMigrationOnce()
    } catch (error) {
      log.error({ err: error }, 'feature_flag_migration.worker_failed')
    }

    if (options?.signal?.aborted) break
    await sleepWithAbort(intervalMs, options?.signal)
  }
}

export function startFeatureFlagMigrationWorker(options?: {
  signal?: AbortSignal
  intervalMs?: number
}): { stop: () => void } {
  const controller = new AbortController()
  const externalSignal = options?.signal

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else {
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      })
    }
  }

  void runFeatureFlagMigrationWorker({
    signal: controller.signal,
    intervalMs: options?.intervalMs,
  })

  return {
    stop: () => controller.abort(),
  }
}
