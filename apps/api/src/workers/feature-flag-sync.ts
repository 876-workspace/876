import { isDeepStrictEqual } from 'node:util'

import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { getPostHogClient } from '@/providers/posthog/client'

import {
  listFeatureFlagsForSync,
  updateFeatureFlagForSync,
} from './feature-flag-sync.repository'

const logger = getLogger('feature-flag-sync')

export type FeatureFlagSyncSummary = {
  configured: boolean
  scanned: number
  updated: number
  unmapped: number
  missing: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function metadataForFeature(
  providerFeature: Record<string, unknown>
): Record<string, unknown> {
  return {
    active: providerFeature['active'] === true,
    filters: providerFeature['filters'] ?? null,
    rollout_percentage: providerFeature['rollout_percentage'] ?? null,
    variants: providerFeature['variants'] ?? null,
    deleted: providerFeature['deleted'] === true,
  }
}

function providerFeatureId(providerFeature: Record<string, unknown>): string {
  return String(providerFeature['id'])
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

export async function syncFeatureFlagsOnce(): Promise<FeatureFlagSyncSummary> {
  const settings = getSettings()
  if (
    !settings.posthog.personalApiKey ||
    !settings.posthog.projectId ||
    !settings.posthog.host
  ) {
    return {
      configured: false,
      scanned: 0,
      updated: 0,
      unmapped: 0,
      missing: 0,
    }
  }

  const posthog = getPostHogClient(settings)
  const [providerFeatures, localFeatures] = await Promise.all([
    posthog.listFeatures(),
    listFeatureFlagsForSync(),
  ])
  const providerFeaturesByKey = new Map<string, Record<string, unknown>>()
  let unmapped = 0
  let missing = 0
  let updated = 0

  for (const providerFeature of providerFeatures) {
    const key = providerFeature['key']
    if (typeof key === 'string') providerFeaturesByKey.set(key, providerFeature)
  }

  const localFeaturesBySlug = new Map(
    localFeatures.map((feature) => [feature.slug, feature])
  )
  for (const [key] of providerFeaturesByKey) {
    if (localFeaturesBySlug.has(key)) continue
    unmapped += 1
    logger.warn({ key }, 'feature_flag_sync.unmapped_key')
  }

  for (const localFeature of localFeatures) {
    const providerFeature = providerFeaturesByKey.get(localFeature.slug)
    if (!providerFeature) {
      missing += 1
      logger.warn(
        { feature_id: localFeature.id, slug: localFeature.slug },
        'feature_flag_sync.missing_provider_flag'
      )
      continue
    }

    const metadata = metadataForFeature(providerFeature)
    const enabled = providerFeature['active'] === true
    const id = providerFeatureId(providerFeature)
    const changed =
      localFeature.provider !== 'posthog' ||
      localFeature.providerFeatureId !== id ||
      localFeature.enabled !== enabled ||
      !isDeepStrictEqual(asRecord(localFeature.providerMetadata), metadata)
    if (!changed) continue

    const now = BigInt(nowUnixSeconds())
    await updateFeatureFlagForSync(localFeature.id, {
      provider: 'posthog',
      providerFeatureId: id,
      enabled,
      providerMetadata: metadata,
      syncedAt: now,
      updatedAt: now,
    })
    updated += 1
  }

  const summary = {
    configured: true,
    scanned: providerFeatures.length,
    updated,
    unmapped,
    missing,
  }
  logger.info(summary, 'feature_flag_sync.completed')
  return summary
}

export async function runFeatureFlagSyncWorker(options?: {
  signal?: AbortSignal
}): Promise<void> {
  const settings = getSettings()

  while (!options?.signal?.aborted) {
    try {
      await syncFeatureFlagsOnce()
    } catch (error) {
      logger.error({ err: error }, 'feature_flag_sync.worker_failed')
    }

    if (options?.signal?.aborted) break
    await sleepWithAbort(
      settings.featureFlags.syncIntervalSeconds * 1000,
      options?.signal
    )
  }
}

export function startFeatureFlagSyncWorker(options?: {
  signal?: AbortSignal
}): { stop: () => Promise<void> } {
  const controller = new AbortController()
  const externalSignal = options?.signal
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort()
    else
      externalSignal.addEventListener('abort', () => controller.abort(), {
        once: true,
      })
  }

  const done = runFeatureFlagSyncWorker({ signal: controller.signal })
  void done.catch((err) =>
    logger.error({ err }, 'feature_flag_sync.worker_failed')
  )

  return {
    stop: async () => {
      controller.abort()
      try {
        await done
      } catch {}
    },
  }
}
