import { createAlertsResource } from './resources/alerts'
import { createCalendarsResource } from './resources/calendars'
import { createCalendarSubscriptionsResource } from './resources/calendar-subscriptions'
import { createEventParticipantsResource } from './resources/event-participants'
import { createEventsResource } from './resources/events'
import { createExportsResource } from './resources/exports'
import { createMyWorkResource } from './resources/my-work'
import { createRecurrenceRulesResource } from './resources/recurrence-rules'
import { createRemindersResource } from './resources/reminders'
import { createSyncConnectionsResource } from './resources/sync-connections'
import { createSyncMappingsResource } from './resources/sync-mappings'
import { createTaskAssignmentsResource } from './resources/task-assignments'
import { createTaskLinksResource } from './resources/task-links'
import { createTaskListsResource } from './resources/task-lists'
import { createTasksResource } from './resources/tasks'
import { createWorkRuntime, type WorkOperatorClientOptions } from './runtime'
import { createWorkWorkspaceClient } from './workspace'

/** Server-only operator client used by 876-owned orchestration surfaces. */
export function create876WorkOperatorClient(
  options: WorkOperatorClientOptions
) {
  const runtime = createWorkRuntime(options)
  return {
    tasks: createTasksResource(runtime),
    taskLists: createTaskListsResource(runtime),
    taskLinks: createTaskLinksResource(runtime),
    taskAssignments: createTaskAssignmentsResource(runtime),
    reminders: createRemindersResource(runtime),
    recurrenceRules: createRecurrenceRulesResource(runtime),
    alerts: createAlertsResource(runtime),
    calendars: createCalendarsResource(runtime),
    calendarSubscriptions: createCalendarSubscriptionsResource(runtime),
    events: createEventsResource(runtime),
    eventParticipants: createEventParticipantsResource(runtime),
    myWork: createMyWorkResource(runtime),
    syncConnections: createSyncConnectionsResource(runtime),
    syncMappings: createSyncMappingsResource(runtime),
    exports: createExportsResource(runtime),
    workspace: createWorkWorkspaceClient(runtime),
  }
}

export type WorkOperatorClient = ReturnType<typeof create876WorkOperatorClient>
export type { WorkOperatorClientOptions } from './runtime'
