import { appMemberships } from './app-memberships'
import { phaseCustomFieldsClient } from './phase-custom-fields'
import {
  commentsClient,
  customFieldsClient,
  issuesClient,
  labelsClient,
  milestonesClient,
  phasesClient,
  projectsClient,
  workItemTypesClient,
  workflowStatesClient,
} from './projects'
import { onboarding } from './onboarding'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  phases: phasesClient,
  phaseCustomFields: phaseCustomFieldsClient,
  labels: labelsClient,
  comments: commentsClient,
  workItemTypes: workItemTypesClient,
  workflowStates: workflowStatesClient,
  milestones: milestonesClient,
  customFields: customFieldsClient,
}

export { appMemberships } from './app-memberships'
export { onboarding } from './onboarding'
export { phaseCustomFieldsClient } from './phase-custom-fields'
export {
  projectsClient,
  issuesClient,
  phasesClient,
  labelsClient,
  commentsClient,
  workItemTypesClient,
  workflowStatesClient,
  milestonesClient,
  customFieldsClient,
} from './projects'
export type { ClientResult } from './request'
