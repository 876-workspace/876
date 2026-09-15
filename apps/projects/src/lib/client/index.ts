import { appMemberships } from './app-memberships'
import { cyclesClient } from './cycles'
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
import { taskListsClient } from './task-lists'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  phases: phasesClient,
  cycles: cyclesClient,
  taskLists: taskListsClient,
  phaseCustomFields: phaseCustomFieldsClient,
  labels: labelsClient,
  comments: commentsClient,
  workItemTypes: workItemTypesClient,
  workflowStates: workflowStatesClient,
  milestones: milestonesClient,
  customFields: customFieldsClient,
}

export { appMemberships } from './app-memberships'
export { cyclesClient } from './cycles'
export { onboarding } from './onboarding'
export { taskListsClient } from './task-lists'
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
