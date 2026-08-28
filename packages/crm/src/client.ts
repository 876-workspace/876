import 'server-only'

import { createCustomersResource } from './resources/customers'
import { createRequestCategoriesResource } from './resources/request-categories'
import { createRequestFormRequestsResource } from './resources/request-form-requests'
import { createRequestFormSubmissionsResource } from './resources/request-form-submissions'
import { createRequestFormsResource } from './resources/request-forms'
import { createRequestNotesResource } from './resources/request-notes'
import { createRequestPrioritiesResource } from './resources/request-priorities'
import { createRequestRemindersResource } from './resources/request-reminders'
import { createRequestTasksResource } from './resources/request-tasks'
import { createRequestsResource } from './resources/requests'
import { createTeamsResource } from './resources/teams'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876CrmClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)

  return {
    customers: createCustomersResource(runtime),
    requests: createRequestsResource(runtime),
    requestNotes: createRequestNotesResource(runtime),
    teams: createTeamsResource(runtime),
    requestCategories: createRequestCategoriesResource(runtime),
    requestPriorities: createRequestPrioritiesResource(runtime),
    requestTasks: createRequestTasksResource(runtime),
    requestReminders: createRequestRemindersResource(runtime),
    requestForms: createRequestFormsResource(runtime),
    requestFormSubmissions: createRequestFormSubmissionsResource(runtime),
    requestFormRequests: createRequestFormRequestsResource(runtime),
  }
}

export type CrmClient = ReturnType<typeof create876CrmClient>
