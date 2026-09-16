import { appMemberships } from './app-memberships'
import { baselinesClient } from './baselines'
import { cyclesClient } from './cycles'
import { eventsClient } from './events'
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
import { remindersClient } from './reminders'
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
  baselines: baselinesClient,
  events: eventsClient,
  reminders: remindersClient,
}

export { appMemberships } from './app-memberships'
export { baselinesClient } from './baselines'
export { cyclesClient } from './cycles'
export { eventsClient } from './events'
export { onboarding } from './onboarding'
export { remindersClient } from './reminders'
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
