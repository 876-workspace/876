'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkSessionClient } from './session'
import type { WorkTask, WorkTaskImportance } from './types'

export type WorkBrowserMyWorkFilter = Pick<WorkMyWorkFilter, 'from' | 'to'>
export type WorkBrowserTaskFilter = { listId?: string }
export type WorkBrowserTaskDue = { at: number; timeZone: string }
export type WorkBrowserCreateTaskInput = {
  title: string
  listId?: string
  description?: string | null
  importance?: WorkTaskImportance
  due?: WorkBrowserTaskDue | null
}
export type WorkBrowserUpdateTaskInput = {
  title?: string
  description?: string | null
  importance?: WorkTaskImportance
  due?: WorkBrowserTaskDue | null
}

type WorkTaskListPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['taskLists']['list']>>['data']
>
type WorkTaskPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['tasks']['list']>>['data']
>

type WorkCalendarPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['calendars']['list']>>['data']
>

function myWorkPath(filter: WorkBrowserMyWorkFilter): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  return `/api/my-work?${params}`
}

function tasksPath(filter: WorkBrowserTaskFilter): string {
  const params = new URLSearchParams()
  if (filter.listId) params.set('listId', filter.listId)
  const query = params.toString()
  return `/api/tasks${query ? `?${query}` : ''}`
}

function taskPath(taskId: string): string {
  return `/api/tasks/${encodeURIComponent(taskId)}`
}

export const browserWork = {
  myWork: {
    retrieve(filter: WorkBrowserMyWorkFilter) {
      return requestApiResult<WorkMyWork>(myWorkPath(filter))
    },
  },
  taskLists: {
    list() {
      return requestApiResult<WorkTaskListPage>('/api/task-lists')
    },
  },
  tasks: {
    list(filter: WorkBrowserTaskFilter = {}) {
      return requestApiResult<WorkTaskPage>(tasksPath(filter))
    },
    create(input: WorkBrowserCreateTaskInput) {
      return requestApiResult<WorkTask>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    update(taskId: string, input: WorkBrowserUpdateTaskInput) {
      return requestApiResult<WorkTask>(taskPath(taskId), {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update', ...input }),
      })
    },
    complete(taskId: string) {
      return requestApiResult<WorkTask>(taskPath(taskId), {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete' }),
      })
    },
    cancel(taskId: string) {
      return requestApiResult<WorkTask>(taskPath(taskId), {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      })
    },
  },
  calendars: {
    list() {
      return requestApiResult<WorkCalendarPage>('/api/calendars')
    },
  },
} as const