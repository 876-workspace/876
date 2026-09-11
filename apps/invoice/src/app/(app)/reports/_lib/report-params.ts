import {
  REPORT_PRESETS,
  resolveCustomRange,
  resolveReportPreset,
  validateReportRange,
  type ReportGroupBy,
  type ReportPreset,
} from '@876/billing-ui/report-range'

export interface ReportPageParams {
  from: number
  to: number
  groupBy: ReportGroupBy
  preset: ReportPreset
}

export interface RawReportSearchParams {
  from?: string | string[]
  to?: string | string[]
  groupBy?: string | string[]
  preset?: string | string[]
  fromDate?: string | string[]
  toDate?: string | string[]
}

export const DEFAULT_REPORT_TIMEZONE = 'America/Jamaica'

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function defaultGroupBy(preset: ReportPreset): ReportGroupBy {
  return preset === 'this-quarter' || preset === 'this-year' ? 'month' : 'day'
}

function parseGroupBy(value: string | undefined, preset: ReportPreset): ReportGroupBy {
  if (value === 'day' || value === 'week' || value === 'month') return value
  return defaultGroupBy(preset)
}

function parseUnix(value: string | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Resolves report URL params to an SDK-ready range server-side. Explicit
 * `from`/`to` win when valid; otherwise the preset (in the tenant timezone)
 * decides; anything invalid falls back to this month so the page never fails.
 */
export function resolveReportPageParams(
  raw: RawReportSearchParams,
  timeZone: string,
  nowSeconds: number
): ReportPageParams {
  const presetRaw = first(raw.preset)
  const preset: ReportPreset = REPORT_PRESETS.includes(presetRaw as ReportPreset)
    ? (presetRaw as ReportPreset)
    : 'this-month'
  const groupBy = parseGroupBy(first(raw.groupBy), preset)

  if (preset === 'custom') {
    const custom = resolveCustomRange(
      first(raw.fromDate) ?? '',
      first(raw.toDate) ?? '',
      timeZone
    )
    if (custom.error === null && validateReportRange(custom.data)) {
      return { ...custom.data, groupBy, preset }
    }
  } else {
    const from = parseUnix(first(raw.from))
    const to = parseUnix(first(raw.to))
    if (from !== null && to !== null && validateReportRange({ from, to })) {
      return { from, to, groupBy, preset }
    }
  }

  const fallback =
    preset === 'custom'
      ? resolveReportPreset('this-month', timeZone, nowSeconds)
      : resolveReportPreset(preset, timeZone, nowSeconds)
  return { ...fallback, groupBy, preset }
}
