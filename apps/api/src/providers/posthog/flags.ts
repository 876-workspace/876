import { PostHog } from 'posthog-node'

import type { Settings } from '@/config'
import { getLogger } from '@/platform/logger'

const log = getLogger('posthog')

const FEATURE_FLAG_EVALUATION_TIMEOUT_MS = 3_000
const FEATURE_FLAGS_POLLING_INTERVAL_MS = 30_000

export type FeatureFlagEvaluator = {
  evaluate(params: {
    distinctId: string
    slugs: string[]
    groups?: Record<string, string>
    personProperties?: Record<string, string>
    groupProperties?: Record<string, Record<string, string>>
  }): Promise<Map<string, boolean>>
  shutdown(): Promise<void>
}

let client: PostHog | null = null
let clientInitializationFailed = false

function getClient(settings: Settings): PostHog {
  if (client) return client

  const options = settings.posthog.personalApiKey
    ? {
        host: settings.posthog.host,
        personalApiKey: settings.posthog.personalApiKey,
        featureFlagsPollingInterval: FEATURE_FLAGS_POLLING_INTERVAL_MS,
      }
    : { host: settings.posthog.host }

  client = new PostHog(settings.posthog.projectApiKey, options)
  return client
}

function evaluationOptions(
  params: Parameters<FeatureFlagEvaluator['evaluate']>[0]
) {
  return {
    ...(params.groups ? { groups: params.groups } : {}),
    ...(params.personProperties
      ? { personProperties: params.personProperties }
      : {}),
    ...(params.groupProperties
      ? { groupProperties: params.groupProperties }
      : {}),
    sendFeatureFlagEvents: true,
  }
}

async function evaluateWithTimeout(
  posthog: PostHog,
  params: Parameters<FeatureFlagEvaluator['evaluate']>[0]
): Promise<Map<string, boolean>> {
  let timeout: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      Promise.all(
        params.slugs.map(async (slug) => {
          const value = await posthog.getFeatureFlag(
            slug,
            params.distinctId,
            evaluationOptions(params)
          )
          return [slug, value] as const
        })
      ).then((results) => {
        const decisions = new Map<string, boolean>()
        for (const [slug, value] of results) {
          if (value !== undefined) decisions.set(slug, value !== false)
        }
        return decisions
      }),
      new Promise<Map<string, boolean>>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('PostHog feature flag evaluation timed out.')),
          FEATURE_FLAG_EVALUATION_TIMEOUT_MS
        )
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export function getPostHogFlagEvaluator(
  settings: Settings
): FeatureFlagEvaluator | null {
  if (!settings.posthog.projectApiKey || !settings.posthog.host) return null
  if (clientInitializationFailed) return null

  let posthog: PostHog
  try {
    posthog = getClient(settings)
  } catch (error) {
    clientInitializationFailed = true
    log.warn(
      { error_type: error instanceof Error ? error.name : typeof error },
      'posthog.flag_client_init_failed'
    )
    return null
  }

  return {
    async evaluate(params) {
      try {
        return await evaluateWithTimeout(posthog, params)
      } catch (error) {
        log.warn(
          {
            slug_count: params.slugs.length,
            error_type: error instanceof Error ? error.name : typeof error,
          },
          'posthog.flag_evaluation_failed'
        )
        return new Map()
      }
    },
    async shutdown() {
      await posthog.shutdown()
    },
  }
}
