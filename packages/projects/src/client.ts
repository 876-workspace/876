import 'server-only'

import { createCommentsResource } from './resources/comments'
import { createCustomFieldsResource } from './resources/custom-fields'
import { createCustomFieldValuesResource } from './resources/custom-field-values'
import { createIssuesResource } from './resources/issues'
import { createIssueDependenciesResource } from './resources/issue-dependencies'
import { createIssueRelationsResource } from './resources/issue-relations'
import { createLabelsResource } from './resources/labels'
import { createBaselinesResource } from './resources/baselines'
import { createBudgetsResource } from './resources/budgets'
import { createCapacityResource } from './resources/capacity'
import { createProjectBillingResource } from './resources/project-billing'
import { createRatesResource } from './resources/rates'
import { createReportsResource } from './resources/reports'
import { createCalendarResource } from './resources/calendar'
import { createEventsResource } from './resources/events'
import { createMyWorkResource } from './resources/my-work'
import { createRemindersResource } from './resources/reminders'
import { createTimeEntriesResource } from './resources/time-entries'
import { createTimesheetsResource } from './resources/timesheets'
import { createCyclesResource } from './resources/cycles'
import { createGanttResource } from './resources/gantt'
import { createMilestonesResource } from './resources/milestones'
import { createTaskListsResource } from './resources/task-lists'
import { createPresetsResource } from './resources/presets'
import { createProjectsResource } from './resources/projects'
import { createProjectTemplatesResource } from './resources/project-templates'
import { createTenantsResource } from './resources/tenants'
import { createWorkflowStatesResource } from './resources/workflow-states'
import { createWorkItemTypesResource } from './resources/work-item-types'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876ProjectsClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  return {
    tenants: createTenantsResource(runtime),
    projects: createProjectsResource(runtime),
    projectTemplates: createProjectTemplatesResource(runtime),
    issues: createIssuesResource(runtime),
    issueRelations: createIssueRelationsResource(runtime),
    issueDependencies: createIssueDependenciesResource(runtime),
    labels: createLabelsResource(runtime),
    comments: createCommentsResource(runtime),
    workItemTypes: createWorkItemTypesResource(runtime),
    workflowStates: createWorkflowStatesResource(runtime),
    milestones: createMilestonesResource(runtime),
    taskLists: createTaskListsResource(runtime),
    cycles: createCyclesResource(runtime),
    customFields: createCustomFieldsResource(runtime),
    customFieldValues: createCustomFieldValuesResource(runtime),
    presets: createPresetsResource(runtime),
    gantt: createGanttResource(runtime),
    baselines: createBaselinesResource(runtime),
    projectBilling: createProjectBillingResource(runtime),
    budgets: createBudgetsResource(runtime),
    capacity: createCapacityResource(runtime),
    rates: createRatesResource(runtime),
    reports: createReportsResource(runtime),
    events: createEventsResource(runtime),
    reminders: createRemindersResource(runtime),
    timeEntries: createTimeEntriesResource(runtime),
    timesheets: createTimesheetsResource(runtime),
    calendar: createCalendarResource(runtime),
    myWork: createMyWorkResource(runtime),
  }
}

export type ProjectsClient = ReturnType<typeof create876ProjectsClient>
