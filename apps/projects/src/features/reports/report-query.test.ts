import { describe, expect, it } from 'vitest'

import {
  csvExportHref,
  parseReportGroup,
  reportGroupLabel,
  reportHref,
} from './report-query'
import { REPORT_LINKS } from '@/types/reporting'

const SEPTEMBER = { from: 1788220800, to: 1790812800 }

describe('parseReportGroup', () => {
  it('accepts each dimension the time report groups by', () => {
    expect(parseReportGroup('project')).toBe('project')
    expect(parseReportGroup('user')).toBe('user')
    expect(parseReportGroup('issue')).toBe('issue')
  })

  it('falls back to projects for a missing or unknown dimension', () => {
    expect(parseReportGroup(undefined)).toBe('project')
    expect(parseReportGroup('team')).toBe('project')
  })
})

describe('reportGroupLabel', () => {
  it('labels the grouping as the report table does', () => {
    expect(reportGroupLabel('project')).toBe('Project')
    expect(reportGroupLabel('user')).toBe('Member')
    expect(reportGroupLabel('issue')).toBe('Issue')
  })
})

describe('reportHref', () => {
  it('carries the period as unix seconds', () => {
    expect(reportHref('/reports/work', SEPTEMBER)).toBe(
      '/reports/work?from=1788220800&to=1790812800'
    )
  })

  it('carries the grouping when one is given', () => {
    expect(reportHref('/reports/time', SEPTEMBER, 'user')).toBe(
      '/reports/time?from=1788220800&to=1790812800&groupBy=user'
    )
  })

  it('links every report the dashboard offers', () => {
    expect(REPORT_LINKS.map((link) => link.href)).toEqual([
      '/reports/work',
      '/reports/time',
      '/reports/budget-variance',
      '/reports/workload',
    ])
  })
})

describe('csvExportHref', () => {
  it('points at the export route with the period', () => {
    expect(csvExportHref('work', { period: SEPTEMBER })).toBe(
      '/api/reports/work?from=1788220800&to=1790812800&format=csv'
    )
  })

  it('carries the grouping for the time report', () => {
    expect(csvExportHref('time', { period: SEPTEMBER, groupBy: 'issue' })).toBe(
      '/api/reports/time?from=1788220800&to=1790812800&groupBy=issue&format=csv'
    )
  })

  it('exports a period-less report with the format alone', () => {
    expect(csvExportHref('health')).toBe('/api/reports/health?format=csv')
  })
})
