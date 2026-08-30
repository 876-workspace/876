import { createRemindersResource } from './resources/reminders'
import { createTasksResource } from './resources/tasks'
import {
  createWorkIntegrationRuntime,
  type WorkIntegrationClientOptions,
} from './runtime'

/** Creates the organization-scoped 876 Work integration client. */
export function create876WorkIntegrationClient(
  options: WorkIntegrationClientOptions = {}
) {
  const runtime = createWorkIntegrationRuntime(options)
  return {
    tasks: createTasksResource(runtime),
    reminders: createRemindersResource(runtime),
  }
}

export type WorkIntegrationClient = ReturnType<
  typeof create876WorkIntegrationClient
>
export type { WorkIntegrationClientOptions } from './runtime'
