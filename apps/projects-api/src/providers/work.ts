import type { AppError } from '@876/core'
import { create876WorkServiceClient } from '@876/work/service'

import { getError, type ProjectsError } from '../http/errors.js'
import { getLogger } from '../platform/logger.js'

const log = getLogger('providers.work')

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
  return { service: 'projects', resource: 'milestone', id: milestoneId } as const
}

export function projectsEventWorkContext(eventId: string) {
  return { service: 'projects', resource: 'event', id: eventId } as const
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
