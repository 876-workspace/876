'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkSessionClient } from './session'
import type { WorkTask } from './types'

export type WorkBrowserMyWorkFilter = Pick<WorkMyWorkFilter, 'from' | 'to'>
export type WorkBrowserTaskFilter = { listId?: string }

type WorkTaskListPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['taskLists']['list']>>['data']
>
type WorkTaskPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['tasks']['list']>>['data']
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
    complete(taskId: string) {
      return requestApiResult<WorkTask>(
        `/api/tasks/${encodeURIComponent(taskId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'DONE' }),
        }
      )
    },
  },
} as const