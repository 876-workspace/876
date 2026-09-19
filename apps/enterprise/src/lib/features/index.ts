import 'server-only'

import { cache } from 'react'
import {
  createAppExperimentResolver,
  createExperimentDecisionsFetcher,
} from '@876/core/platform'
import { ENTERPRISE_APP_SLUG } from '@/lib/enterprise-app'
import { getPlatformClient } from '@/lib/clients/platform'

const getExperimentDecisions = cache(
  createExperimentDecisionsFetcher({
    appSlug: ENTERPRISE_APP_SLUG,
    getPlatformClient,
  })
)

/**
 * Resolves a PostHog experiment for the Enterprise app.
 */
export const getEnterpriseExperiment =
  createAppExperimentResolver(getExperimentDecisions)
