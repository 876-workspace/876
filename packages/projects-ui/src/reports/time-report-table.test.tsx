// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { TimeReport } from './types'
import { TimeReportTable } from './time-report-table'

function makeReport(overrides?: Partial<TimeReport>): TimeReport {
  return {
    object: 'projects.time-report',
    groupBy: 'project',
    period: { from: 1704067200, to: 1706745600 },
    data: [
      {
        key: 'prj_1',
        label: 'Apollo',
        billableMinutes: 90,
        nonBillableMinutes: 30,
      },
      {
        key: 'prj_2',
        label: 'Borealis',
        billableMinutes: 45,
        nonBillableMinutes: 0,
      },
    ],
    ...overrides,
  }
}

describe('TimeReportTable', () => {
  afterEach(cleanup)

  it('renders billable, non-billable, and total minutes per row', () => {
    render(<TimeReportTable report={makeReport()} />)

    const row = screen.getByText('Apollo').closest('tr') as HTMLElement
    expect(within(row).getByText('1h 30m')).toBeInTheDocument()
    expect(within(row).getByText('30m')).toBeInTheDocument()
    expect(within(row).getByText('2h')).toBeInTheDocument()
  })

  it('renders zero minutes as 0m', () => {
    render(<TimeReportTable report={makeReport()} />)

    const row = screen.getByText('Borealis').closest('tr') as HTMLElement
    expect(within(row).getByText('0m')).toBeInTheDocument()
  })

  it('renders the totals footer summed across rows', () => {
    const { container } = render(<TimeReportTable report={makeReport()} />)

    const footer = container.querySelector('tfoot') as HTMLElement
    expect(within(footer).getByText('2h 15m')).toBeInTheDocument()
    expect(within(footer).getByText('30m')).toBeInTheDocument()
    expect(within(footer).getByText('2h 45m')).toBeInTheDocument()
  })

  it('labels the first column from the group-by dimension', () => {
    render(<TimeReportTable report={makeReport({ groupBy: 'user' })} />)

    expect(
      screen.getByRole('columnheader', { name: 'Member' })
    ).toBeInTheDocument()
  })

  it('marks the group label as the row subject', () => {
    render(<TimeReportTable report={makeReport()} />)

    expect(screen.getByText('Apollo')).toHaveClass('font-medium')
  })

  it('renders a short empty state without a totals footer', () => {
    const { container } = render(
      <TimeReportTable report={makeReport({ data: [] })} />
    )

    expect(screen.getByText('No time logged')).toBeInTheDocument()
    expect(container.querySelector('tfoot')).toBeNull()
  })
})
