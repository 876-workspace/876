import { appMemberships } from './app-memberships'
import {
  commentsClient,
  issuesClient,
  labelsClient,
  projectsClient,
} from './projects'
import { onboarding } from './onboarding'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  labels: labelsClient,
  comments: commentsClient,
}

export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export {
  projectsClient,
  issuesClient,
  labelsClient,
  commentsClient,
} from './projects'
export type { ClientResult } from './request'
