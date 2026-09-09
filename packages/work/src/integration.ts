import { createAlertsResource } from './resources/alerts'
import { createCalendarsResource } from './resources/calendars'
import { createCalendarSubscriptionsResource } from './resources/calendar-subscriptions'
import { createEventParticipantsResource } from './resources/event-participants'
import { createEventsResource } from './resources/events'
import { createExportsResource } from './resources/exports'
import { createMyWorkResource } from './resources/my-work'
import { createRecurrenceRulesResource } from './resources/recurrence-rules'
import { createRemindersResource } from './resources/reminders'
import { createResourceWorkResource } from './resources/resource-work'
import { createSyncConnectionsResource } from './resources/sync-connections'
import { createSyncMappingsResource } from './resources/sync-mappings'
import { createTaskAssignmentsResource } from './resources/task-assignments'
import { createTaskLinksResource } from './resources/task-links'
import { createTaskListsResource } from './resources/task-lists'
import { createTasksResource } from './resources/tasks'
import {
  createWorkIntegrationRuntime,
  type WorkIntegrationClientOptions,
} from './runtime'

/** Creates the organization-scoped 876 Work integration client. */
export function create876WorkIntegrationClient(
  options: WorkIntegrationClientOptions = {}
) {
  const runtime = createWorkIntegrationRuntime(options)
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
    resourceWork: createResourceWorkResource(runtime),
    syncConnections: createSyncConnectionsResource(runtime),
    syncMappings: createSyncMappingsResource(runtime),
    exports: createExportsResource(runtime),
  }
}

export type WorkIntegrationClient = ReturnType<
  typeof create876WorkIntegrationClient
>
export type { WorkIntegrationClientOptions } from './runtime'
