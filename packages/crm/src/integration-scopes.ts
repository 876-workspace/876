/**
 * Stable scopes for a host product acting through CRM's integration tier.
 * Host products receive these scopes; they never receive Console's operator key.
 */
export const CRM_INTEGRATION_SCOPES = [
  'crm.requests.read',
  'crm.requests.write',
  'crm.customers.read',
  'crm.customers.write',
  'crm.tasks.read',
  'crm.tasks.write',
  'crm.reminders.read',
  'crm.reminders.write',
  'crm.notes.read',
  'crm.notes.write',
  'crm.teams.read',
  'crm.teams.write',
  'crm.categories.read',
  'crm.categories.write',
  'crm.priorities.read',
  'crm.priorities.write',
  'crm.request-forms.read',
  'crm.request-forms.write',
  'crm.reports.read',
] as const

export type CrmIntegrationScope = (typeof CRM_INTEGRATION_SCOPES)[number]

export function isCrmIntegrationScope(
  value: string
): value is CrmIntegrationScope {
  return (CRM_INTEGRATION_SCOPES as readonly string[]).includes(value)
}
