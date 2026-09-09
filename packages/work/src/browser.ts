'use client'

import { requestApiResult } from '@876/core/client'

import type { WorkEventResource } from './event-contracts'
import type { WorkMyWork, WorkMyWorkFilter } from './my-work'
import type { WorkRecurrenceDraft } from './recurrence-contracts'
import type {
  WorkEventParticipantResponseInput,
  WorkTaskAssignmentResponseInput,
} from './response-contracts'
import type { WorkResourceRef } from './resource-ref'
import type { WorkResourceWork } from './resource-work'
import type { WorkSessionClient } from './session'
import type {
  UpdateWorkAlertInput,
  UpdateWorkCalendarInput,
  UpdateWorkTaskListInput,
  WorkAlert,
  WorkAssignmentRole,
  WorkAssignmentTargetType,
  WorkCalendar,
  WorkCalendarSubscription,
  WorkCalendarVisibility,
  WorkEventParticipant,
  WorkParticipantKind,
  WorkParticipantRole,
  WorkRecurrenceRule,
  WorkReminder,
  WorkTask,
  WorkTaskAssignment,
  WorkTaskImportance,
  WorkTaskList,
} from './types'

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
  recurrenceRuleId?: string | null
}
export type WorkBrowserUpdateTaskInput = {
  title?: string
  description?: string | null
  importance?: WorkTaskImportance
  due?: WorkBrowserTaskDue | null
  recurrenceRuleId?: string | null
}
export type WorkBrowserCreateTaskListInput = {
  name: string
  description?: string | null
  sortOrder?: number
}
export type WorkBrowserUpdateTaskListInput = UpdateWorkTaskListInput
export type WorkBrowserCreateTaskAssignmentInput = {
  targetType: WorkAssignmentTargetType
  assigneeId: string
  role?: WorkAssignmentRole
  delegatedFromAssignmentId?: string | null
}
export type WorkBrowserUpdateTaskAssignmentInput = {
  role: WorkAssignmentRole
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
      recurrenceRuleId?: string | null
    }
  | {
      title: string
      calendarId: string
      allDay: true
      startDate: string
      endDate: string
      description?: string | null
      location?: string | null
      recurrenceRuleId?: string | null
    }
export type WorkBrowserCreateEventParticipantInput =
  | {
      kind: Extract<WorkParticipantKind, 'USER'>
      participantId: string
      name?: string | null
      role?: WorkParticipantRole
    }
  | {
      kind: Extract<WorkParticipantKind, 'EMAIL'>
      email: string
      name?: string | null
      role?: WorkParticipantRole
    }
export type WorkBrowserCreateReminderInput = {
  title: string
  note?: string | null
  remindAt: number
  timeZone?: string | null
  recurrenceRuleId?: string | null
}
export type WorkBrowserCreateAlertInput = {
  triggerType: 'ABSOLUTE' | 'RELATIVE'
  triggerAt?: number | null
  offsetSeconds?: number | null
  action?: 'NOTIFICATION' | 'EMAIL'
}
export type WorkBrowserCreateCalendarInput = {
  name: string
  description?: string | null
  timeZone: string
  visibility?: WorkCalendarVisibility
}
export type WorkBrowserUpdateCalendarInput = UpdateWorkCalendarInput
export type WorkBrowserCreateCalendarSubscriptionInput = {
  color?: string | null
  isVisible?: boolean
  defaultReminderMinutes?: number[]
}
export type WorkBrowserUpdateCalendarSubscriptionInput = {
  color?: string | null
  isVisible?: boolean
  defaultReminderMinutes?: number[]
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
type WorkTaskAssignmentPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['taskAssignments']['list']>>['data']
>
type WorkParticipantPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['eventParticipants']['list']>>['data']
>
type WorkAlertPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['alerts']['list']>>['data']
>
type WorkSubscriptionPage = NonNullable<
  Awaited<ReturnType<WorkSessionClient['calendarSubscriptions']['list']>>['data']
>

type DeletedResource = { object: string; id: string; deleted: true }

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

function resourceItemPath(
  resource: 'tasks' | 'events' | 'reminders',
  id: string,
  context: WorkResourceRef | undefined,
  contextRouteBase?: string
): string {
  const root = context ? `${contextRouteBase}/${resource}` : `/api/${resource}`
  return `${root}/${encodeURIComponent(id)}`
}

function alertsPath(parentPath: string) {
  return `${parentPath}/alerts`
}

function recurrencePath(parentPath: string) {
  return `${parentPath}/recurrence`
}

export function createBrowserWork(options: { contextRouteBase?: string } = {}) {
  const contextRouteBase = options.contextRouteBase?.replace(/\/$/, '')
  const requireContextRoute = () => {
    if (!contextRouteBase)
      throw new Error('Contextual Work requires a host-owned route base.')
    return contextRouteBase
  }
  const contextualItemPath = (
    resource: 'tasks' | 'events' | 'reminders',
    id: string,
    context?: WorkResourceRef
  ) =>
    resourceItemPath(
      resource,
      id,
      context,
      context ? requireContextRoute() : undefined
    )

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
      create(input: WorkBrowserCreateTaskListInput) {
        return requestApiResult<WorkTaskList>('/api/task-lists', {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      update(listId: string, input: WorkBrowserUpdateTaskListInput) {
        return requestApiResult<WorkTaskList>(
          `/api/task-lists/${encodeURIComponent(listId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
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
          contextualItemPath('tasks', taskId, context),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'update', ...input }),
          }
        )
      },
      complete(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkTask>(
          contextualItemPath('tasks', taskId, context),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'complete' }),
          }
        )
      },
      cancel(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkTask>(
          contextualItemPath('tasks', taskId, context),
          {
            method: 'PATCH',
            body: JSON.stringify({ action: 'cancel' }),
          }
        )
      },
      recurrence: {
        retrieve(taskId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkRecurrenceRule | null>(
            recurrencePath(contextualItemPath('tasks', taskId, context))
          )
        },
        set(
          taskId: string,
          input: WorkRecurrenceDraft,
          context?: WorkResourceRef
        ) {
          return requestApiResult<WorkRecurrenceRule>(
            recurrencePath(contextualItemPath('tasks', taskId, context)),
            { method: 'PATCH', body: JSON.stringify(input) }
          )
        },
        clear(taskId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkTask>(
            recurrencePath(contextualItemPath('tasks', taskId, context)),
            { method: 'DELETE' }
          )
        },
      },
    },
    taskAssignments: {
      list(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkTaskAssignmentPage>(
          `${contextualItemPath('tasks', taskId, context)}/assignments`
        )
      },
      create(
        taskId: string,
        input: WorkBrowserCreateTaskAssignmentInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkTaskAssignment>(
          `${contextualItemPath('tasks', taskId, context)}/assignments`,
          { method: 'POST', body: JSON.stringify(input) }
        )
      },
      update(
        taskId: string,
        assignmentId: string,
        input: WorkBrowserUpdateTaskAssignmentInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkTaskAssignment>(
          `${contextualItemPath('tasks', taskId, context)}/assignments/${encodeURIComponent(assignmentId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      respond(
        taskId: string,
        assignmentId: string,
        input: WorkTaskAssignmentResponseInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkTaskAssignment>(
          `${contextualItemPath('tasks', taskId, context)}/assignments/${encodeURIComponent(assignmentId)}/response`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      delete(
        taskId: string,
        assignmentId: string,
        context?: WorkResourceRef
      ) {
        return requestApiResult<DeletedResource>(
          `${contextualItemPath('tasks', taskId, context)}/assignments/${encodeURIComponent(assignmentId)}`,
          { method: 'DELETE' }
        )
      },
    },
    calendars: {
      list() {
        return requestApiResult<WorkCalendarPage>('/api/calendars')
      },
      create(input: WorkBrowserCreateCalendarInput) {
        return requestApiResult<WorkCalendar>('/api/calendars', {
          method: 'POST',
          body: JSON.stringify(input),
        })
      },
      update(calendarId: string, input: WorkBrowserUpdateCalendarInput) {
        return requestApiResult<WorkCalendar>(
          `/api/calendars/${encodeURIComponent(calendarId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
    },
    calendarSubscriptions: {
      list(calendarId: string) {
        return requestApiResult<WorkSubscriptionPage>(
          `/api/calendars/${encodeURIComponent(calendarId)}/subscriptions`
        )
      },
      create(
        calendarId: string,
        input: WorkBrowserCreateCalendarSubscriptionInput
      ) {
        return requestApiResult<WorkCalendarSubscription>(
          `/api/calendars/${encodeURIComponent(calendarId)}/subscriptions`,
          { method: 'POST', body: JSON.stringify(input) }
        )
      },
      update(
        calendarId: string,
        subscriptionId: string,
        input: WorkBrowserUpdateCalendarSubscriptionInput
      ) {
        return requestApiResult<WorkCalendarSubscription>(
          `/api/calendars/${encodeURIComponent(calendarId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      delete(calendarId: string, subscriptionId: string) {
        return requestApiResult<DeletedResource>(
          `/api/calendars/${encodeURIComponent(calendarId)}/subscriptions/${encodeURIComponent(subscriptionId)}`,
          { method: 'DELETE' }
        )
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
      recurrence: {
        retrieve(eventId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkRecurrenceRule | null>(
            recurrencePath(contextualItemPath('events', eventId, context))
          )
        },
        set(
          eventId: string,
          input: WorkRecurrenceDraft,
          context?: WorkResourceRef
        ) {
          return requestApiResult<WorkRecurrenceRule>(
            recurrencePath(contextualItemPath('events', eventId, context)),
            { method: 'PATCH', body: JSON.stringify(input) }
          )
        },
        clear(eventId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkEventResource>(
            recurrencePath(contextualItemPath('events', eventId, context)),
            { method: 'DELETE' }
          )
        },
      },
    },
    eventParticipants: {
      list(eventId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkParticipantPage>(
          `${contextualItemPath('events', eventId, context)}/participants`
        )
      },
      create(
        eventId: string,
        input: WorkBrowserCreateEventParticipantInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkEventParticipant>(
          `${contextualItemPath('events', eventId, context)}/participants`,
          { method: 'POST', body: JSON.stringify(input) }
        )
      },
      respond(
        eventId: string,
        participantId: string,
        input: WorkEventParticipantResponseInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkEventParticipant>(
          `${contextualItemPath('events', eventId, context)}/participants/${encodeURIComponent(participantId)}/response`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      delete(
        eventId: string,
        participantId: string,
        context?: WorkResourceRef
      ) {
        return requestApiResult<DeletedResource>(
          `${contextualItemPath('events', eventId, context)}/participants/${encodeURIComponent(participantId)}`,
          { method: 'DELETE' }
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
      recurrence: {
        retrieve(reminderId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkRecurrenceRule | null>(
            recurrencePath(
              contextualItemPath('reminders', reminderId, context)
            )
          )
        },
        set(
          reminderId: string,
          input: WorkRecurrenceDraft,
          context?: WorkResourceRef
        ) {
          return requestApiResult<WorkRecurrenceRule>(
            recurrencePath(
              contextualItemPath('reminders', reminderId, context)
            ),
            { method: 'PATCH', body: JSON.stringify(input) }
          )
        },
        clear(reminderId: string, context?: WorkResourceRef) {
          return requestApiResult<WorkReminder>(
            recurrencePath(
              contextualItemPath('reminders', reminderId, context)
            ),
            { method: 'DELETE' }
          )
        },
      },
    },
    alerts: {
      listForTask(taskId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkAlertPage>(
          alertsPath(contextualItemPath('tasks', taskId, context))
        )
      },
      createForTask(
        taskId: string,
        input: WorkBrowserCreateAlertInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkAlert>(
          alertsPath(contextualItemPath('tasks', taskId, context)),
          { method: 'POST', body: JSON.stringify(input) }
        )
      },
      updateForTask(
        taskId: string,
        alertId: string,
        input: UpdateWorkAlertInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkAlert>(
          `${alertsPath(contextualItemPath('tasks', taskId, context))}/${encodeURIComponent(alertId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      deleteForTask(
        taskId: string,
        alertId: string,
        context?: WorkResourceRef
      ) {
        return requestApiResult<DeletedResource>(
          `${alertsPath(contextualItemPath('tasks', taskId, context))}/${encodeURIComponent(alertId)}`,
          { method: 'DELETE' }
        )
      },
      listForEvent(eventId: string, context?: WorkResourceRef) {
        return requestApiResult<WorkAlertPage>(
          alertsPath(contextualItemPath('events', eventId, context))
        )
      },
      createForEvent(
        eventId: string,
        input: WorkBrowserCreateAlertInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkAlert>(
          alertsPath(contextualItemPath('events', eventId, context)),
          { method: 'POST', body: JSON.stringify(input) }
        )
      },
      updateForEvent(
        eventId: string,
        alertId: string,
        input: UpdateWorkAlertInput,
        context?: WorkResourceRef
      ) {
        return requestApiResult<WorkAlert>(
          `${alertsPath(contextualItemPath('events', eventId, context))}/${encodeURIComponent(alertId)}`,
          { method: 'PATCH', body: JSON.stringify(input) }
        )
      },
      deleteForEvent(
        eventId: string,
        alertId: string,
        context?: WorkResourceRef
      ) {
        return requestApiResult<DeletedResource>(
          `${alertsPath(contextualItemPath('events', eventId, context))}/${encodeURIComponent(alertId)}`,
          { method: 'DELETE' }
        )
      },
    },
  } as const
}

export type WorkBrowserClient = ReturnType<typeof createBrowserWork>
export const browserWork = createBrowserWork()
