'use client'

import type {
  CreateTaskListInput,
  TaskList,
  TaskListList,
  UpdateTaskListInput,
} from '@876/projects/contracts'

import { request } from './request'

type CreateTaskListParams = Omit<CreateTaskListInput, 'actorUserId'> & {
  projectId: string
}
type UpdateTaskListParams = Omit<UpdateTaskListInput, 'actorUserId'>

export const taskListsClient = {
  create(params: CreateTaskListParams) {
    return request<TaskList>('/api/task-lists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(taskListId: string, params: UpdateTaskListParams) {
    return request<TaskList>(
      `/api/task-lists/${encodeURIComponent(taskListId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      }
    )
  },
  delete(taskListId: string) {
    return request<{ object: string; id: string; deleted: true }>(
      `/api/task-lists/${encodeURIComponent(taskListId)}`,
      { method: 'DELETE' }
    )
  },
  archive(taskListId: string) {
    return request<TaskList>(
      `/api/task-lists/${encodeURIComponent(taskListId)}/archive`,
      { method: 'POST' }
    )
  },
  restore(taskListId: string) {
    return request<TaskList>(
      `/api/task-lists/${encodeURIComponent(taskListId)}/restore`,
      { method: 'POST' }
    )
  },
  moveIssues(taskListId: string, issueIds: string[]) {
    return request<TaskList>(
      `/api/task-lists/${encodeURIComponent(taskListId)}/issues`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ issueIds }),
      }
    )
  },
  reorder(projectId: string, orderedIds: string[]) {
    return request<TaskListList>(
      `/api/projects/${encodeURIComponent(projectId)}/task-lists/order`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      }
    )
  },
}
