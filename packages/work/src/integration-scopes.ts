/**
 * Stable scopes for an app acting through Work's integration tier.
 * Apps receive these scoped grants; they never receive Work's operator key.
 */
export const WORK_INTEGRATION_SCOPES = [
  'work.tasks.read',
  'work.tasks.write',
  'work.reminders.read',
  'work.reminders.write',
] as const

export type WorkIntegrationScope = (typeof WORK_INTEGRATION_SCOPES)[number]

export function isWorkIntegrationScope(
  value: string
): value is WorkIntegrationScope {
  return (WORK_INTEGRATION_SCOPES as readonly string[]).includes(value)
}
