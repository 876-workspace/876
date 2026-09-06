import 'server-only'

import { cache } from 'react'
import { resolveExperimentDecision } from '@876/core/platform'
import { ENTERPRISE_APP_SLUG } from '@/lib/enterprise-app'
import { getPlatformClient } from '@/lib/services/platform'

/**
 * Resolves a PostHog experiment for the Enterprise app.
 */
export async function getEnterpriseExperiment<T = unknown>(
  featureSlug: string,
  context?: {
    userId?: string
    organizationId?: string
    visitorId?: string
  }
) {
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
  const platform = await getPlatformClient()
  const { data, error } = await platform.features.evaluateDetails({
    appSlug: ENTERPRISE_APP_SLUG,
    userId,
    organizationId,
    visitorId,
  })
  return error || !data ? null : data.data
})
