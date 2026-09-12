import 'server-only'

import { createCustomersResource } from './resources/customers'
import { createRequestCategoriesResource } from './resources/request-categories'
import { createRequestEventsResource } from './resources/request-events'
import { createRequestFormRequestsResource } from './resources/request-form-requests'
import { createRequestFormSubmissionsResource } from './resources/request-form-submissions'
import { createRequestFormsResource } from './resources/request-forms'
import { createRequestNotesResource } from './resources/request-notes'
import { createRequestPrioritiesResource } from './resources/request-priorities'
import { createRequestRemindersResource } from './resources/request-reminders'
import { createRequestTasksResource } from './resources/request-tasks'
import { createRequestsResource } from './resources/requests'
import { createTeamsResource } from './resources/teams'
import { buildServiceRuntime, type ServiceRuntimeOptions } from './runtime'

/** First-party 876 service access with a named per-app credential. */
export function create876CrmServiceClient(options: ServiceRuntimeOptions) {
  const runtime = buildServiceRuntime(options)

  return {
    customers: createCustomersResource(runtime),
    requests: createRequestsResource(runtime),
    requestNotes: createRequestNotesResource(runtime),
    teams: createTeamsResource(runtime),
    requestCategories: createRequestCategoriesResource(runtime),
    requestPriorities: createRequestPrioritiesResource(runtime),
    requestTasks: createRequestTasksResource(runtime),
    requestReminders: createRequestRemindersResource(runtime),
    requestEvents: createRequestEventsResource(runtime),
    requestForms: createRequestFormsResource(runtime),
    requestFormSubmissions: createRequestFormSubmissionsResource(runtime),
    requestFormRequests: createRequestFormRequestsResource(runtime),
  }
}

export type CrmServiceClient = ReturnType<typeof create876CrmServiceClient>
export type CrmServiceClientOptions = ServiceRuntimeOptions
