import { appMemberships } from './app-memberships'
import { issuesClient, labelsClient, projectsClient } from './projects'
import { onboarding } from './onboarding'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  labels: labelsClient,
}

export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export { projectsClient, issuesClient, labelsClient } from './projects'
export type { ClientResult } from './request'
