// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { WorkloadReport, WorkloadRow } from './types'
import { WorkloadTable } from './workload-table'

function makeRow(overrides?: Partial<WorkloadRow>): WorkloadRow {
  return {
    userId: 'usr_1',
    label: 'Ada',
    assignedOpenItems: 3,
    plannedMinutes: 600,
    loggedMinutes: 300,
    capacityMinutes: 2400,
    utilisationPercent: 25,
    ...overrides,
  }
}

function makeReport(rows: WorkloadRow[]): WorkloadReport {
  return {
    object: 'projects.workload-report',
    period: { from: 1704067200, to: 1706745600 },
    data: rows,
  }
}

describe('WorkloadTable', () => {
  afterEach(cleanup)

  it('renders utilisation as a percentage', () => {
    render(<WorkloadTable report={makeReport([makeRow()])} />)

    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('renders No capacity when utilisation is null', () => {
    render(
      <WorkloadTable
        report={makeReport([makeRow({ utilisationPercent: null })])}
      />
    )

    expect(screen.getByText('No capacity')).toHaveClass('text-muted-foreground')
  })

  it('flags utilisation above 100 percent', () => {
    render(
      <WorkloadTable
        report={makeReport([makeRow({ utilisationPercent: 133 })])}
      />
    )

    expect(screen.getByText('133%')).toHaveClass('text-destructive')
  })

  it('renders planned, logged, and capacity durations', () => {
    render(<WorkloadTable report={makeReport([makeRow()])} />)

    const row = screen.getByText('Ada').closest('tr') as HTMLElement
    expect(within(row).getByText('10h')).toBeInTheDocument()
    expect(within(row).getByText('5h')).toBeInTheDocument()
    expect(within(row).getByText('40h')).toBeInTheDocument()
  })

  it('renders an em dash for a missing capacity', () => {
    render(
      <WorkloadTable
        report={makeReport([makeRow({ capacityMinutes: null })])}
      />
    )

    const row = screen.getByText('Ada').closest('tr') as HTMLElement
    expect(within(row).getAllByText('—')).toHaveLength(1)
  })

  it('marks the member name as the row subject', () => {
    render(<WorkloadTable report={makeReport([makeRow()])} />)

    expect(screen.getByText('Ada')).toHaveClass('font-medium')
  })

  it('renders a short empty state', () => {
    render(<WorkloadTable report={makeReport([])} />)

    expect(screen.getByText('No assigned work')).toBeInTheDocument()
  })
})
