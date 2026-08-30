/** Stable scopes for an app acting through Work's integration tier. */
export const WORK_INTEGRATION_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
  'work.reminders.read',
  'work.reminders.write',
  'work.calendars.read',
  'work.calendars.write',
  'work.events.read',
  'work.events.write',
  'work.alerts.read',
  'work.alerts.write',
  'work.sync.read',
  'work.sync.write',
] as const

/** CRM is a contextual Work consumer; adding Work features must not widen its grant. */
export const WORK_CRM_INTEGRATION_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
  'work.reminders.read',
  'work.reminders.write',
] as const satisfies readonly WorkIntegrationScope[]

export type WorkIntegrationScope = (typeof WORK_INTEGRATION_SCOPES)[number]

export function isWorkIntegrationScope(value: string): value is WorkIntegrationScope {
  return (WORK_INTEGRATION_SCOPES as readonly string[]).includes(value)
}
