'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkTask } from './types'

export type WorkBrowserMyWorkFilter = Pick<WorkMyWorkFilter, 'from' | 'to'>

function myWorkPath(filter: WorkBrowserMyWorkFilter): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  return `/api/my-work?${params}`
}

export const browserWork = {
  myWork: {
    retrieve(filter: WorkBrowserMyWorkFilter) {
      return requestApiResult<WorkMyWork>(myWorkPath(filter))
    },
  },
  tasks: {
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