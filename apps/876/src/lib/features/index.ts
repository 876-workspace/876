import 'server-only'

import { cache } from 'react'
import {
  createAppExperimentResolver,
  createExperimentDecisionsFetcher,
} from '@876/core/platform'
import { CONSUMER_APP_SLUG } from '@/lib/consumer-app'
import { getAuthRoutingClient } from '@/lib/auth/auth-routing-client'
import type { ExperimentDecision } from '@876/core/platform'

export type { ExperimentDecision }

const getExperimentDecisions = cache(
  createExperimentDecisionsFetcher({
    appSlug: CONSUMER_APP_SLUG,
    getPlatformClient: getAuthRoutingClient,
  })
)

/**
 * Resolves a PostHog experiment for the Consumer app.
 */
export const getConsumerExperiment: <T = unknown>(
  featureSlug: string,
  context?: {
    userId?: string
    organizationId?: string
    visitorId?: string
  }
) => Promise<ExperimentDecision<T>> =
  createAppExperimentResolver(getExperimentDecisions)
