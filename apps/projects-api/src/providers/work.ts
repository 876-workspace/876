import type { AppError } from '@876/core'
import { create876WorkServiceClient } from '@876/work/service'

import { getError, type ProjectsError } from '../http/errors.js'
import { getLogger } from '../platform/logger.js'

const log = getLogger('providers.work')
const projectsCalendarIds = new Map<string, Promise<string | ProjectsError>>()
const projectsCalendarName = (organizationId: string) =>
  `Projects — ${organizationId}`

// Work requires an actor for calendars and events while legacy Projects events
// permitted a null createdBy. This stable service actor preserves that input
// shape without manufacturing a user identity.
export const PROJECTS_SYSTEM_ACTOR = 'system'

export function workClient() {
  return create876WorkServiceClient({
    baseUrl: process.env.WORK_API_URL,
    apiKey: process.env.PROJECTS_API_876_KEY,
  })
}

export function projectsIssueWorkContext(issueId: string) {
  return { service: 'projects', resource: 'issue', id: issueId } as const
}

export function projectsMilestoneWorkContext(milestoneId: string) {
  return {
    service: 'projects',
    resource: 'milestone',
    id: milestoneId,
  } as const
}

export function projectsEventWorkContext(eventId: string) {
  return { service: 'projects', resource: 'event', id: eventId } as const
}

export function projectsProjectWorkContext(projectId: string) {
  return { service: 'projects', resource: 'project', id: projectId } as const
}

/**
 * Resolves the single calendar used by a Projects organization. The promise is
 * cached per organization so concurrent event creates share one Work lookup
 * and, after a successful create, one Work calendar id.
 */
export function resolveProjectsCalendarId(
  organizationId: string,
  createdBy: string
): Promise<string | ProjectsError> {
  const cached = projectsCalendarIds.get(organizationId)
  if (cached) return cached

  const resolving = (async () => {
    const client = workClient()
    const name = projectsCalendarName(organizationId)

    // Page the whole list: a Work organization also holds calendars other apps
    // created, so stopping at the first page could miss ours and create a
    // second one under the same name.
    let startingAfter: string | undefined
    for (;;) {
      const calendars = await client.calendars.list(organizationId, {
        limit: 100,
        ...(startingAfter ? { startingAfter } : {}),
      })
      if (calendars.error) return workErrorToProjects(calendars.error)
      const existing = calendars.data.data.find(
        (calendar) => calendar.name === name
      )
      if (existing) return existing.id
      if (!calendars.data.has_more) break
      const last = calendars.data.data.at(-1)
      if (!last) break
      startingAfter = last.id
    }

    const created = await client.calendars.create(organizationId, {
      name,
      timeZone: 'UTC',
      createdBy,
    })
    return created.error ? workErrorToProjects(created.error) : created.data.id
  })()

  projectsCalendarIds.set(organizationId, resolving)
  void resolving.then((result) => {
    if (typeof result !== 'string') projectsCalendarIds.delete(organizationId)
  })
  return resolving
}

/**
 * Preserves useful Work failure categories at Projects' provider boundary.
 * The upstream message is logged for operators; callers receive Projects'
 * stable, user-safe error contract. The Projects registry has no dedicated
 * Work-unavailable code, so unmapped failures collapse to internal-error
 * rather than inventing one.
 */
export function workErrorToProjects(
  error: AppError | null | undefined
): ProjectsError {
  let mapped: ProjectsError = getError('projects/internal-error')

  switch (error?.code) {
    case 'work/tenant-not-found':
      mapped = getError('projects/tenant-not-found')
      break
    case 'work/invalid-request':
      mapped = getError('projects/invalid-request')
      break
    case 'work/reminder-not-found':
      mapped = getError('projects/reminder-not-found')
      break
    case 'work/event-not-found':
      mapped = getError('projects/event-not-found')
      break
    case 'work/event-participant-not-found':
      mapped = getError('projects/attendee-not-found')
      break
  }

  log.warn(
    {
      work_error_code: error?.code,
      work_error_message: error?.message,
      projects_error_code: mapped.code,
    },
    'work_error_mapped'
  )

  return mapped
}
