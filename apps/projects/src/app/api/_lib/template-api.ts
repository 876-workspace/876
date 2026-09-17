/**
 * HTTP answers for the template routes (project-templates, save-as-template,
 * clone).
 *
 * The templates module returns `{ data, error }` values whose codes are stable,
 * so the mapping lives in one place rather than being restated per route — a
 * code the module grows later degrades to 400 rather than to a wrong specific.
 * Input the service rejects (a malformed key, an unusable definition) answers
 * 422 like this app's own body validation, not the 400 the service uses
 * internally.
 */
import { apiJson } from '@876/core/api'

import { projectsErrorStatus } from './error-status'

/** A template service failure, answering with the message the service produced. */
export function templateFailure(
  error: { code: string; message: string } | null,
  fallbackMessage: string
): Response {
  return apiJson(
    { error: error?.message ?? fallbackMessage },
    { status: error === null ? 400 : projectsErrorStatus(error.code) }
  )
}

/**
 * The three inclusion flags every template read/write body may carry.
 *
 * Absent means "include it": a template exists to carry its contents, so the
 * caller opts out rather than in — the same default the service applies.
 */
import { templateIncludeSchema } from '@/types/templates'

export { templateIncludeSchema }
