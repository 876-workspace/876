import 'server-only'

import { cache } from 'react'
import {
  createAppExperimentResolver,
  createExperimentDecisionsFetcher,
} from '@876/core/platform'
import { getPlatformClient } from '@/lib/clients/platform'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import type { ProjectsFeatures, ProjectsUiFeatures } from '@/types/features'

/**
 * 876 Projects ships no rollout flags in v1.
 *
 * Every shell affordance is on for everyone, so there is nothing to evaluate
 * and no provider round trip on the render path. Evaluating a flag key that was
 * never seeded would be inventing one at runtime, which
 * `.claude/rules/feature-flags.md` forbids: add the seed entry first, then read
 * it here.
 */
const UI_FEATURES: ProjectsUiFeatures = {
  searchBar: true,
  themeSwitcher: true,
  globalAdd: true,
  appSwitcher: true,
  orgSwitcher: true,
}

export async function getFeatures(): Promise<ProjectsFeatures> {
  return { uiFeatures: UI_FEATURES }
}

const getExperimentDecisions = cache(
  createExperimentDecisionsFetcher({
    appSlug: PROJECTS_APP_SLUG,
    getPlatformClient,
  })
)

/**
 * Resolves a PostHog experiment for the Projects app.
 */
export const getProjectsExperiment =
  createAppExperimentResolver(getExperimentDecisions)
