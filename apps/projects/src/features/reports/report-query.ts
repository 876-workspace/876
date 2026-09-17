import type { ReportPeriod } from '@/types/reporting'

import {
  REPORT_GROUPS,
  type ReportGroup,
  type ReportSlug,
} from '@/types/reporting'

const GROUP_LABELS: Record<ReportGroup, string> = {
  project: 'Project',
  user: 'Member',
  issue: 'Issue',
}

export function reportGroupLabel(group: ReportGroup): string {
  return GROUP_LABELS[group]
}

/** The grouping a `?groupBy=` value asks for, defaulting to projects. */
export function parseReportGroup(value: string | undefined): ReportGroup {
  return REPORT_GROUPS.find((group) => group === value) ?? 'project'
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix === '' ? '' : `?${suffix}`
}

/** A report page's own URL with the period (and grouping) preserved. */
export function reportHref(
  href: string,
  period: ReportPeriod,
  group?: ReportGroup
): string {
  return `${href}${query({
    from: period.from,
    to: period.to,
    groupBy: group,
  })}`
}

/** The app route that streams a report as CSV, with the period preserved. */
export function csvExportHref(
  slug: ReportSlug,
  params: { period?: ReportPeriod; groupBy?: ReportGroup } = {}
): string {
  return `/api/reports/${slug}${query({
    from: params.period?.from,
    to: params.period?.to,
    groupBy: params.groupBy,
    format: 'csv',
  })}`
}
