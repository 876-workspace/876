import { describe, expect, it } from 'vitest'

import { resolveReportPageParams } from './report-params'

const TIME_ZONE = 'America/Jamaica'
const NOW = Date.UTC(2026, 8, 11, 17, 0, 0) / 1000
const MONTH_FROM = Date.UTC(2026, 8, 1, 5, 0, 0) / 1000
const MONTH_TO = Date.UTC(2026, 9, 1, 5, 0, 0) / 1000

describe('resolveReportPageParams', () => {
  it('threads explicit from/to/groupBy into the SDK range exactly', () => {
    expect(
      resolveReportPageParams(
        {
          preset: 'this-month',
          from: String(MONTH_FROM),
          to: String(MONTH_TO),
          groupBy: 'week',
        },
        TIME_ZONE,
        NOW
      )
    ).toEqual({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'week', preset: 'this-month' })
  })

  it('resolves a preset server-side in the tenant timezone', () => {
    expect(
      resolveReportPageParams({ preset: 'this-month' }, TIME_ZONE, NOW)
    ).toEqual({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'day', preset: 'this-month' })
  })

  it('defaults an unknown groupBy by preset', () => {
    expect(
      resolveReportPageParams(
        { preset: 'this-year', groupBy: 'hourly' },
        TIME_ZONE,
        NOW
      ).groupBy
    ).toBe('month')
  })

  it('resolves a valid custom date pair', () => {
    const resolved = resolveReportPageParams(
      { preset: 'custom', fromDate: '2026-09-01', toDate: '2026-09-10' },
      TIME_ZONE,
      NOW
    )
    expect(resolved).toEqual({
      from: MONTH_FROM,
      to: Date.UTC(2026, 8, 11, 5, 0, 0) / 1000,
      groupBy: 'day',
      preset: 'custom',
    })
  })

  it('falls back to this month for an invalid custom range', () => {
    expect(
      resolveReportPageParams(
        { preset: 'custom', fromDate: '2026-09-10', toDate: '2026-09-01' },
        TIME_ZONE,
        NOW
      )
    ).toEqual({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'day', preset: 'custom' })
  })

  it('falls back to this month for an unknown preset', () => {
    expect(
      resolveReportPageParams({ preset: 'forever' }, TIME_ZONE, NOW)
    ).toEqual({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'day', preset: 'this-month' })
  })

  it('ignores an oversized explicit range', () => {
    expect(
      resolveReportPageParams(
        { preset: 'this-month', from: '1', to: String(500 * 86400) },
        TIME_ZONE,
        NOW
      )
    ).toEqual({ from: MONTH_FROM, to: MONTH_TO, groupBy: 'day', preset: 'this-month' })
  })

  it('ignores inverted explicit bounds', () => {
    const resolved = resolveReportPageParams(
      { preset: 'this-week', from: String(MONTH_TO), to: String(MONTH_FROM) },
      TIME_ZONE,
      NOW
    )
    expect(resolved.from).toBeLessThan(resolved.to)
    expect(resolved.preset).toBe('this-week')
  })
})
