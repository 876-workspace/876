import { appMemberships } from './app-memberships'
import { baselinesClient } from './baselines'
import { cyclesClient } from './cycles'
import { eventsClient } from './events'
import { financeClient } from './finance'
import { automationRulesClient } from './automation'
import { layoutsClient } from './layouts'
import { notificationsClient } from './notifications'
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
import { clientGrantsClient, discussionsClient, followsClient, visibilityClient, wikiClient } from './collaboration'
import { onboarding } from './onboarding'
import { remindersClient } from './reminders'
import { workflowsClient } from './workflows'
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
  workflows: workflowsClient,
  automationRules: automationRulesClient,
  notifications: notificationsClient,
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
  follows: followsClient,
  discussions: discussionsClient,
  wiki: wikiClient,
  clientGrants: clientGrantsClient,
  visibility: visibilityClient,
  templates: templatesClient,
}

export { appMemberships } from './app-memberships'
export { baselinesClient } from './baselines'
export { cyclesClient } from './cycles'
export { eventsClient } from './events'
export { financeClient } from './finance'
export { onboarding } from './onboarding'
export { remindersClient } from './reminders'
export {
  clientGrantsClient,
  discussionsClient,
  followsClient,
  visibilityClient,
  wikiClient,
} from './collaboration'
export { taskListsClient } from './task-lists'
export { templatesClient } from './templates'
export { phaseCustomFieldsClient } from './phase-custom-fields'
export { projectCustomFieldsClient } from './project-custom-fields'
export { automationRulesClient } from './automation'
export { layoutsClient } from './layouts'
export { notificationsClient } from './notifications'
export { workflowsClient } from './workflows'
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
