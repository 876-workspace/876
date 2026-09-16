// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ReportPeriodNav } from './report-period-nav'

// September 2026: [Sep 1, Oct 1) in unix seconds.
const SEPTEMBER_FROM = 1788220800
const SEPTEMBER_TO = 1790812800

describe('ReportPeriodNav', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-16T12:00:00.000Z'))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders the period as an inclusive range', () => {
    render(
      <ReportPeriodNav
        basePath="/app/reports"
        from={SEPTEMBER_FROM}
        to={SEPTEMBER_TO}
      />
    )

    expect(screen.getByText('Sep 1, 2026 – Sep 30, 2026')).toBeInTheDocument()
  })

  it('links the previous period as an equal-length span', () => {
    render(
      <ReportPeriodNav
        basePath="/app/reports"
        from={SEPTEMBER_FROM}
        to={SEPTEMBER_TO}
      />
    )

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/app/reports?from=1785628800&to=1788220800'
    )
  })

  it('links the next period as an equal-length span', () => {
    render(
      <ReportPeriodNav
        basePath="/app/reports"
        from={SEPTEMBER_FROM}
        to={SEPTEMBER_TO}
      />
    )

    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/app/reports?from=1790812800&to=1793404800'
    )
  })

  it('links this month to the current UTC month', () => {
    render(
      <ReportPeriodNav
        basePath="/app/reports"
        from={1704067200}
        to={1706745600}
      />
    )

    expect(screen.getByRole('link', { name: 'This month' })).toHaveAttribute(
      'href',
      '/app/reports?from=1788220800&to=1790812800'
    )
  })

  it('preserves an existing query string in the base path', () => {
    render(
      <ReportPeriodNav
        basePath="/app/reports?tab=time"
        from={SEPTEMBER_FROM}
        to={SEPTEMBER_TO}
      />
    )

    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/app/reports?tab=time&from=1790812800&to=1793404800'
    )
  })
})
