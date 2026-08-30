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
import {
  createWorkSessionRuntime,
  type WorkSessionClientOptions,
} from './runtime'

/** Creates the signed-in-user Work client: app credential + bearer token. */
export function create876WorkSessionClient(
  options: WorkSessionClientOptions = {}
) {
  const runtime = createWorkSessionRuntime(options)
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
  }
}

export type WorkSessionClient = ReturnType<typeof create876WorkSessionClient>
export type { WorkSessionClientOptions } from './runtime'
