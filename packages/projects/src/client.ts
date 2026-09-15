import 'server-only'

import { createCommentsResource } from './resources/comments'
import { createCustomFieldsResource } from './resources/custom-fields'
import { createCustomFieldValuesResource } from './resources/custom-field-values'
import { createIssuesResource } from './resources/issues'
import { createLabelsResource } from './resources/labels'
import { createCyclesResource } from './resources/cycles'
import { createMilestonesResource } from './resources/milestones'
import { createTaskListsResource } from './resources/task-lists'
import { createPresetsResource } from './resources/presets'
import { createProjectsResource } from './resources/projects'
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
    issues: createIssuesResource(runtime),
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
  }
}

export type ProjectsClient = ReturnType<typeof create876ProjectsClient>
