import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workTaskAssignmentListSchema,
  workTaskAssignmentSchema,
  type CreateWorkTaskAssignmentInput,
  type UpdateWorkTaskAssignmentInput,
} from '../types'

function root(organizationId: string, taskId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/tasks/${encodeURIComponent(taskId)}/assignments`
}

export function createTaskAssignmentsResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, taskId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: root(organizationId, taskId) },
        workTaskAssignmentListSchema
      )
    },
    create(
      organizationId: string,
      taskId: string,
      input: CreateWorkTaskAssignmentInput
    ) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId, taskId), body: input },
        workTaskAssignmentSchema
      )
    },
    update(
      organizationId: string,
      taskId: string,
      assignmentId: string,
      input: UpdateWorkTaskAssignmentInput
    ) {
      return workRequest(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId, taskId)}/${encodeURIComponent(assignmentId)}`,
          body: input,
        },
        workTaskAssignmentSchema
      )
    },
    delete(organizationId: string, taskId: string, assignmentId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, taskId)}/${encodeURIComponent(assignmentId)}`,
        },
        z.object({
          object: z.literal('task_assignment'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
