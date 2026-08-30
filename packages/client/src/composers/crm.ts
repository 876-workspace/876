import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import type { CrmServerClientOptions } from '../internal/types'
import { createCoreSurface } from './base'

export function createCrmClient(options: CrmServerClientOptions) {
  const services = createServiceClients(options)
  const core = createCoreSurface({ platform: services.platform })
  const crm = requireCapability(services.crm, 'crm')
  const work = services.work?.session ?? services.work?.integration

  return {
    ...core,
    customerProfiles: crm.customers,
    requestCategories: crm.requestCategories,
    requestPriorities: crm.requestPriorities,
    requestForms: crm.requestForms,
    requestFormSubmissions: crm.requestFormSubmissions,
    requestFormRequests: crm.requestFormRequests,
    requestNotes: crm.requestNotes,
    requestReminders: crm.requestReminders,
    requestEvents: crm.requestEvents,
    requests: crm.requests,
    requestTasks: crm.requestTasks,
    teams: crm.teams,
    ...(work
      ? {
          tasks: work.tasks,
          taskLists: work.taskLists,
          taskLinks: work.taskLinks,
          taskAssignments: work.taskAssignments,
          reminders: work.reminders,
          recurrenceRules: work.recurrenceRules,
          alerts: work.alerts,
          calendars: work.calendars,
          calendarSubscriptions: work.calendarSubscriptions,
          events: work.events,
          eventParticipants: work.eventParticipants,
          myWork: work.myWork,
          workExports: work.exports,
        }
      : {}),
  }
}

export type Crm876Client = ReturnType<typeof createCrmClient>
