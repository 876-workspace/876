/**
 * The new-from-template page's preview query.
 *
 * That preview is server-rendered, so the URL is the only channel from the form
 * to the server: the chosen template, the start date, and the three inclusion
 * flags travel as `?templateId&start&include*`. An absent flag means "include",
 * the same default the service applies, so a hand-typed link stays meaningful.
 */
import type { TemplateIncludeFlags } from '@876/projects/contracts'

import { formatDateInput, parseDateInput } from '@/lib/date-input'

export const FROM_TEMPLATE_PATH = '/projects/new/from-template'

export type TemplatePreviewQuery = {
  templateId: string
  startDate: number
  include: Required<TemplateIncludeFlags>
}

export type TemplatePreviewHrefInput = {
  templateId: string
  /** A `type="date"` value; an unusable one is dropped from the URL. */
  start: string
  include: Required<TemplateIncludeFlags>
}

function includeFlag(value: string | undefined): boolean {
  return value !== 'false'
}

/** The preview URL for the from-template page — the one place the query is built. */
export function templatePreviewHref(input: TemplatePreviewHrefInput): string {
  const params = new URLSearchParams({
    templateId: input.templateId,
    includeWorkItems: String(input.include.includeWorkItems),
    includeDependencies: String(input.include.includeDependencies),
    includeBudgets: String(input.include.includeBudgets),
  })

  const startDate = parseDateInput(input.start)
  if (startDate !== null) params.set('start', formatDateInput(startDate))

  return `${FROM_TEMPLATE_PATH}?${params.toString()}`
}

/** Reads a preview request back off the URL, or `null` when it is incomplete. */
export function parseTemplatePreviewQuery(query: {
  templateId?: string
  start?: string
  includeWorkItems?: string
  includeDependencies?: string
  includeBudgets?: string
}): TemplatePreviewQuery | null {
  const templateId = query.templateId?.trim() ?? ''
  if (templateId === '') return null

  const startDate =
    query.start === undefined ? null : parseDateInput(query.start)
  if (startDate === null) return null

  return {
    templateId,
    startDate,
    include: {
      includeWorkItems: includeFlag(query.includeWorkItems),
      includeDependencies: includeFlag(query.includeDependencies),
      includeBudgets: includeFlag(query.includeBudgets),
    },
  }
}
