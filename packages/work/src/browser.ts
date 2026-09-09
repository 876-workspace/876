'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkEventResource } from './event-contracts'
import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkResourceRef } from './resource-ref'
import type { WorkResourceWork } from './resource-work'
import type { WorkSessionClient } from './session'
import type { WorkReminder, WorkTask, WorkTaskImportance } from './types'

export type WorkBrowserMyWorkFilter = Pick<WorkMyWorkFilter, 'from' | 'to'>
export type WorkBrowserResourceWorkFilter = WorkBrowserMyWorkFilter
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

function myWorkPath(filter: WorkBrowserMyWorkFilter): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  return `/api/my-work?${params}`
}

function resourceWorkPath(
  routeBase: string,
  filter: WorkBrowserResourceWorkFilter
): string {
  const params = new URLSearchParams({
    from: String(filter.from),
    to: String(filter.to),
  })
  return `${routeBase}?${params}`
}

function tasksPath(
  filter: WorkBrowserTaskFilter,
  contextRouteBase?: string
): string {
  const params = new URLSearchParams()
  if (filter.listId) params.set('listId', filter.listId)
  if (filter.startingAfter) params.set('startingAfter', filter.startingAfter)
  const query = params.toString()
  const root = filter.context ? `${contextRouteBase}/tasks` : '/api/tasks'
  return `${root}${query ? `?${query}` : ''}`
}

function taskPath(
  taskId: string,
  context: WorkResourceRef | undefined,
  contextRouteBase?: string
): string {
  const root = context ? `${contextRouteBase}/tasks` : '/api/tasks'
  return `${root}/${encodeURIComponent(taskId)}`
}

export function createBrowserWork(options: { contextRouteBase?: string } = {}) {
  const contextRouteBase = options.contextRouteBase?.replace(/\/$/, '')
  const requireContextRoute = () => {
    if (!contextRouteBase)
      throw new Error('Contextual Work requires a host-owned route base.')
    return contextRouteBase
  }

  return {
    myWork: {
      retrieve(filter: WorkBrowserMyWorkFilter) {
        return requestApiResult<WorkMyWork>(myWorkPath(filter))
      },
    },
    resourceWork: {
      retrieve(filter: WorkBrowserResourceWorkFilter) {
        return requestApiResult<WorkResourceWork>(
          resourceWorkPath(requireContextRoute(), filter)
        )
      },
    },
    taskLists: {
      list() {
        return requestApiResult<WorkTaskListPage>('/api/task-lists')
      },
    },
    tasks: {
      list(filter: WorkBrowserTaskFilter = {}) {
        return requestApiResult<WorkTaskPage>(
          tasksPath(
            filter,
            filter.context ? requireContextRoute() : contextRouteBase
          )
        )
      },
      create(input: WorkBrowserCreateTaskInput, context?: WorkResourceRef) {
        const path = context ? `${requireContextRoute()}/tasks` : '/api/tasks'
        return requestApiResult<WorkTask>(path, {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      update(
        taskId: string,
        input: WorkBrowserUpdateTaskInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkTask>(
          taskPath(
            taskId,
            context,
            context ? requireContextRoute() : undefined
          ),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'update', ...input }),
          }
        )
      },
      complete(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkTask>(
          taskPath(
            taskId,
            context,
            context ? requireContextRoute() : undefined
          ),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'complete' }),
          }
        )
      },
      cancel(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkTask>(
          taskPath(
            taskId,
            context,
            context ? requireContextRoute() : undefined
          ),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'cancel' }),
          }
        )
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
          context ? `${requireContextRoute()}/events` : '/api/events',
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
          context ? `${requireContextRoute()}/reminders` : '/api/reminders',
          {
            method: 'POST',
            body: JSON.stringify(input),
          }
        )
      },
    },
  } as const
}

export type WorkBrowserClient = ReturnType<typeof createBrowserWork>
export const browserWork = createBrowserWork()
