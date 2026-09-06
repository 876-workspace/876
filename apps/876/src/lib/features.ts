import 'server-only'

import { cache } from 'react'
import { resolveExperimentDecision } from '@876/core/platform'
import { CONSUMER_APP_SLUG } from '@/lib/consumer-app'
import { getAuthRoutingClient } from '@/lib/auth/auth-routing-client'
import type { ExperimentDecision } from '@876/core/platform'

export type { ExperimentDecision }

/**
 * Resolves a PostHog experiment for the Consumer app.
 */
export async function getConsumerExperiment<T = unknown>(
  featureSlug: string,
  context?: {
    userId?: string
    organizationId?: string
    visitorId?: string
  }
): Promise<ExperimentDecision<T>> {
  return resolveExperimentDecision<T>(
    featureSlug,
    await getExperimentDecisions(
      context?.userId,
      context?.organizationId,
      context?.visitorId
    )
  )
}

const getExperimentDecisions = cache(async function getExperimentDecisions(
  userId: string | undefined,
  organizationId: string | undefined,
  visitorId: string | undefined
) {
  const client = await getAuthRoutingClient()
  const { data, error } = await client.features.evaluateDetails({
    appSlug: CONSUMER_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
