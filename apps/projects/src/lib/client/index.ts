import { appMemberships } from './app-memberships'
import { baselinesClient } from './baselines'
import { cyclesClient } from './cycles'
import { eventsClient } from './events'
import { financeClient } from './finance'
import { layoutsClient } from './layouts'
import { phaseCustomFieldsClient } from './phase-custom-fields'
import { projectCustomFieldsClient } from './project-custom-fields'
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
import { templatesClient } from './templates'

export const client = {
  appMemberships,
  onboarding,
  projects: projectsClient,
  issues: issuesClient,
  phases: phasesClient,
  cycles: cyclesClient,
  taskLists: taskListsClient,
  phaseCustomFields: phaseCustomFieldsClient,
  projectCustomFields: projectCustomFieldsClient,
  layouts: layoutsClient,
  labels: labelsClient,
  comments: commentsClient,
  workItemTypes: workItemTypesClient,
  workflowStates: workflowStatesClient,
  milestones: milestonesClient,
  customFields: customFieldsClient,
  baselines: baselinesClient,
  events: eventsClient,
  finance: financeClient,
  reminders: remindersClient,
  templates: templatesClient,
}

export { appMemberships } from './app-memberships'
export { baselinesClient } from './baselines'
export { cyclesClient } from './cycles'
export { eventsClient } from './events'
export { financeClient } from './finance'
export { onboarding } from './onboarding'
export { remindersClient } from './reminders'
export { taskListsClient } from './task-lists'
export { templatesClient } from './templates'
export { phaseCustomFieldsClient } from './phase-custom-fields'
export { projectCustomFieldsClient } from './project-custom-fields'
export { layoutsClient } from './layouts'
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
