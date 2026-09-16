import 'server-only'

import {
  create876ProjectsServiceClient,
  type ProjectsServiceClient,
} from '@876/projects/service'

let serviceClient: ProjectsServiceClient | undefined

function getServiceClient() {
  if (serviceClient) return serviceClient

  const internalKey = process.env.PROJECTS_INTERNAL_KEY?.trim()
  if (!internalKey) throw new Error('PROJECTS_INTERNAL_KEY is required')

  const baseUrl =
    process.env.PROJECTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_PROJECTS_API_URL?.trim() ||
    'http://localhost:4030'
  serviceClient = create876ProjectsServiceClient({ baseUrl, internalKey })

  return serviceClient
}

/**
 * The app's server-only Projects client.
 *
 * This is the `service` tier — a first-party 876 app calling the service that
 * owns the domain — not `session`: `apps/projects-api` exposes only
 * internal-key routes today, so the app resolves the organization from the
 * signed-in session itself and scopes every call by it. The same shape as
 * `apps/crm/src/lib/services/crm.ts`.
 *
 * Initialization is deferred to first use because the build imports route
 * modules before runtime secrets exist.
 */
export const projects = {
  get tenants() {
    return getServiceClient().tenants
  },
  get projects() {
    return getServiceClient().projects
  },
  get projectTemplates() {
    return getServiceClient().projectTemplates
  },
  get issues() {
    return getServiceClient().issues
  },
  get issueRelations() {
    return getServiceClient().issueRelations
  },
  get issueDependencies() {
    return getServiceClient().issueDependencies
  },
  get labels() {
    return getServiceClient().labels
  },
  get comments() {
    return getServiceClient().comments
  },
  get workItemTypes() {
    return getServiceClient().workItemTypes
  },
  get workflowStates() {
    return getServiceClient().workflowStates
  },
  get milestones() {
    return getServiceClient().milestones
  },
  get cycles() {
    return getServiceClient().cycles
  },
  get events() {
    return getServiceClient().events
  },
  get reminders() {
    return getServiceClient().reminders
  },
  get calendar() {
    return getServiceClient().calendar
  },
  get myWork() {
    return getServiceClient().myWork
  },
  get taskLists() {
    return getServiceClient().taskLists
  },
  get gantt() {
    return getServiceClient().gantt
  },
  get baselines() {
    return getServiceClient().baselines
  },
  get timeEntries() {
    return getServiceClient().timeEntries
  },
  get timesheets() {
    return getServiceClient().timesheets
  },
  get projectBilling() {
    return getServiceClient().projectBilling
  },
  get budgets() {
    return getServiceClient().budgets
  },
  get rates() {
    return getServiceClient().rates
  },
  get customFields() {
    return getServiceClient().customFields
  },
  get customFieldValues() {
    return getServiceClient().customFieldValues
  },
  get presets() {
    return getServiceClient().presets
  },
  get reports() {
    return getServiceClient().reports
  },
  get capacity() {
    return getServiceClient().capacity
  },
}
