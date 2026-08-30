import 'server-only'

import { createRemindersResource } from './resources/reminders'
import { createTasksResource } from './resources/tasks'
import {
  createWorkRuntime,
  type WorkOperatorClientOptions,
} from './runtime'
import { createWorkWorkspaceClient } from './workspace'

/** Server-only operator client used by 876-owned orchestration surfaces. */
export function create876WorkOperatorClient(options: WorkOperatorClientOptions) {
  const runtime = createWorkRuntime(options)
  return {
    tasks: createTasksResource(runtime),
    reminders: createRemindersResource(runtime),
    workspace: createWorkWorkspaceClient(runtime),
  }
}

export type { WorkOperatorClientOptions } from './runtime'
