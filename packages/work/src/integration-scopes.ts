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
  'work.my-work.read',
  'work.sync.read',
  'work.sync.write',
] as const

/**
 * CRM is an intentional Work consumer. Its grant expands only when CRM gains a
 * corresponding feature; adding a new Work capability does not grant it by
 * default.
 */
export const WORK_CRM_INTEGRATION_SCOPES = [
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
  'work.my-work.read',
] as const satisfies readonly WorkIntegrationScope[]

export type WorkIntegrationScope = (typeof WORK_INTEGRATION_SCOPES)[number]

export function isWorkIntegrationScope(
  value: string
): value is WorkIntegrationScope {
  return (WORK_INTEGRATION_SCOPES as readonly string[]).includes(value)
}
