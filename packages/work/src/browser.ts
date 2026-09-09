'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkEventResource } from './event-contracts'
import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkResourceRef } from './resource-ref'
import type { WorkResourceWork } from './resource-work'
import type { WorkSessionClient } from './session'
import type { WorkReminder, WorkTask, WorkTaskImportance } from './types'

export type WorkBrowserMyWorkFilter = Pick<WorkMyWorkFilter, 'from' | 'to'>
export type WorkBrowserResourceWorkFilter = WorkBrowserMyWorkFilter & {
  context: WorkResourceRef
}
export type WorkBrowserTaskFilter = {
  context?: WorkResourceRef
  listId?: string
  startingAfter?: string
}
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
export type WorkBrowserCreateEventInput =
  | {
      title: string
      calendarId: string
      allDay: false
      startAt: number
      endAt: number
      timeZone: string
      description?: string | null
      location?: string | null
    }
  | {
      title: string
      calendarId: string
      allDay: true
      startDate: string
      endDate: string
      description?: string | null
      location?: string | null
    }
export type WorkBrowserCreateReminderInput = {
  title: string
  note?: string | null
  remindAt: number
  timeZone?: string | null
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

function appendContext(params: URLSearchParams, context?: WorkResourceRef) {
  if (!context) return
  params.set('contextService', context.service)
  params.set('contextResource', context.resource)
  params.set('contextId', context.externalId)
}

function withContext(path: string, context?: WorkResourceRef) {
  if (!context) return path
  const params = new URLSearchParams()
  appendContext(params, context)
  return `${path}?${params}`
}

function myWorkPath(filter: WorkBrowserMyWorkFilter): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  return `/api/my-work?${params}`
}

function resourceWorkPath(filter: WorkBrowserResourceWorkFilter): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  appendContext(params, filter.context)
  return `/api/resource-work?${params}`
}

function tasksPath(filter: WorkBrowserTaskFilter): string {
  const params = new URLSearchParams()
  appendContext(params, filter.context)
  if (filter.listId) params.set('listId', filter.listId)
  if (filter.startingAfter) params.set('startingAfter', filter.startingAfter)
  const query = params.toString()
  return `/api/tasks${query ? `?${query}` : ''}`
}

function taskPath(taskId: string, context?: WorkResourceRef): string {
  return withContext(`/api/tasks/${encodeURIComponent(taskId)}`, context)
}

export const browserWork = {
  myWork: {
    retrieve(filter: WorkBrowserMyWorkFilter) {
      return requestApiResult<WorkMyWork>(myWorkPath(filter))
    },
  },
  resourceWork: {
    retrieve(filter: WorkBrowserResourceWorkFilter) {
      return requestApiResult<WorkResourceWork>(resourceWorkPath(filter))
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
    create(input: WorkBrowserCreateTaskInput, context?: WorkResourceRef) {
      return requestApiResult<WorkTask>(withContext('/api/tasks', context), {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    update(
      taskId: string,
      input: WorkBrowserUpdateTaskInput,
      context?: WorkResourceRef
    ) {
      return requestApiResult<WorkTask>(taskPath(taskId, context), {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update', ...input }),
      })
    },
    complete(taskId: string, context?: WorkResourceRef) {
      return requestApiResult<WorkTask>(taskPath(taskId, context), {
        method: 'PATCH',
        body: JSON.stringify({ action: 'complete' }),
      })
    },
    cancel(taskId: string, context?: WorkResourceRef) {
      return requestApiResult<WorkTask>(taskPath(taskId, context), {
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
  events: {
    create(input: WorkBrowserCreateEventInput, context?: WorkResourceRef) {
      return requestApiResult<WorkEventResource>(
        withContext('/api/events', context),
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      )
    },
  },
  reminders: {
    create(input: WorkBrowserCreateReminderInput, context?: WorkResourceRef) {
      return requestApiResult<WorkReminder>(
        withContext('/api/reminders', context),
        {
          method: 'POST',
          body: JSON.stringify(input),
        }
      )
    },
  },
} as const
