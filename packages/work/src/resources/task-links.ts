import { z } from 'zod'

import { workRequest } from '../request'
import type { WorkRuntime } from '../runtime'
import {
  workTaskLinkListSchema,
  workTaskLinkSchema,
  type CreateWorkTaskLinkInput,
} from '../types'

function root(organizationId: string, taskId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/tasks/${encodeURIComponent(taskId)}/links`
}

export function createTaskLinksResource(runtime: WorkRuntime) {
  return {
    list(organizationId: string, taskId: string) {
      return workRequest(
        runtime,
        { method: 'GET', path: root(organizationId, taskId) },
        workTaskLinkListSchema
      )
    },
    create(
      organizationId: string,
      taskId: string,
      input: CreateWorkTaskLinkInput
    ) {
      return workRequest(
        runtime,
        { method: 'POST', path: root(organizationId, taskId), body: input },
        workTaskLinkSchema
      )
    },
    delete(organizationId: string, taskId: string, linkId: string) {
      return workRequest(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId, taskId)}/${encodeURIComponent(linkId)}`,
        },
        z.object({
          object: z.literal('task_link'),
          id: z.string(),
          deleted: z.literal(true),
        })
      )
    },
  }
}
