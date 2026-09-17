import { timePeriodQuery } from './time-period'
import type { TimePeriod } from '@/types/time'

export function projectTimeHref(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/time`
}

export function timePeriodHref(period: TimePeriod): string {
  return `/time?${timePeriodQuery(period)}`
}

/** Appends the entry query the inline form opens and closes on. */
export function withEntryParam(baseHref: string, value: string): string {
  const separator = baseHref.includes('?') ? '&' : '?'

  return `${baseHref}${separator}entry=${encodeURIComponent(value)}`
}
