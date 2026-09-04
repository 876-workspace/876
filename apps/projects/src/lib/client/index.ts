import { appMemberships } from './app-memberships'
import {
  commentsClient,
  issuesClient,
  labelsClient,
  milestonesClient,
  projectsClient,
  customFieldsClient,
  workItemTypesClient,
  workflowStatesClient,
} from './projects'
import { onboarding } from './onboarding'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  labels: labelsClient,
  comments: commentsClient,
  workItemTypes: workItemTypesClient,
  workflowStates: workflowStatesClient,
  milestones: milestonesClient,
  customFields: customFieldsClient,
}

export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export {
  projectsClient,
  issuesClient,
  labelsClient,
  commentsClient,
  workItemTypesClient,
  workflowStatesClient,
  milestonesClient,
  customFieldsClient,
} from './projects'
export type { ClientResult } from './request'
