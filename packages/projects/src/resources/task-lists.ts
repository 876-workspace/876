import { request } from '../request'
import type { Runtime } from '../runtime'
import {
  taskListListSchema,
  taskListSchema,
  workBreakdownSchema,
  deletedSchema,
  type CreateTaskListInput,
  type MoveTaskListIssuesInput,
  type ReorderTaskListsInput,
  type RequestOptions,
  type TaskListListParams,
  type UpdateTaskListInput,
} from '../types'

function projectRoot(organizationId: string, projectId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/projects/${encodeURIComponent(projectId)}/task-lists`
}

function root(organizationId: string) {
  return `/v1/organizations/${encodeURIComponent(organizationId)}/task-lists`
}

function toQueryString(params?: TaskListListParams): string {
  if (!params || !params.includeArchived) return ''
  return `?${new URLSearchParams({ includeArchived: 'true' }).toString()}`
}

export function createTaskListsResource(runtime: Runtime) {
  return {
    list(
      organizationId: string,
      projectId: string,
      query: TaskListListParams & RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${projectRoot(organizationId, projectId)}${toQueryString(query)}`,
          signal: query.signal,
        },
        taskListListSchema
      )
    },
    create(
      organizationId: string,
      projectId: string,
      input: CreateTaskListInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: projectRoot(organizationId, projectId),
          body: input,
          signal: options.signal,
        },
        taskListSchema
      )
    },
    retrieve(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        taskListSchema
      )
    },
    update(
      organizationId: string,
      id: string,
      input: UpdateTaskListInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PATCH',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          body: input,
          signal: options.signal,
        },
        taskListSchema
      )
    },
    delete(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'DELETE',
          path: `${root(organizationId)}/${encodeURIComponent(id)}`,
          signal: options.signal,
        },
        deletedSchema
      )
    },
    archive(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/archive`,
          body: {},
          signal: options.signal,
        },
        taskListSchema
      )
    },
    restore(organizationId: string, id: string, options: RequestOptions = {}) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/restore`,
          body: {},
          signal: options.signal,
        },
        taskListSchema
      )
    },
    reorder(
      organizationId: string,
      projectId: string,
      input: ReorderTaskListsInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'PUT',
          path: `${projectRoot(organizationId, projectId)}/order`,
          body: input,
          signal: options.signal,
        },
        taskListListSchema
      )
    },
    moveIssues(
      organizationId: string,
      id: string,
      input: MoveTaskListIssuesInput,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'POST',
          path: `${root(organizationId)}/${encodeURIComponent(id)}/issues`,
          body: input,
          signal: options.signal,
        },
        taskListSchema
      )
    },
    workBreakdown(
      organizationId: string,
      projectId: string,
      options: RequestOptions = {}
    ) {
      return request(
        runtime,
        {
          method: 'GET',
          path: `${projectRoot(organizationId, projectId).replace('/task-lists', '/work-breakdown')}`,
          signal: options.signal,
        },
        workBreakdownSchema
      )
    },
  }
}
