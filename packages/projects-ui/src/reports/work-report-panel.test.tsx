// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { WorkReport } from './types'
import { WorkReportPanel } from './work-report-panel'

function makeReport(overrides?: Partial<WorkReport>): WorkReport {
  return {
    object: 'projects.work-report',
    period: { from: 1704067200, to: 1706745600 },
    byState: [
      { key: 'todo', label: 'Todo', count: 8 },
      { key: 'in-progress', label: 'In Progress', count: 4 },
      { key: 'done', label: 'Done', count: 2 },
    ],
    byType: [{ key: 'task', label: 'Task', count: 14 }],
    byAssignee: [{ key: 'usr_1', label: 'Ada', count: 14 }],
    overdue: 0,
    total: 14,
    ...overrides,
  }
}

describe('WorkReportPanel', () => {
  afterEach(cleanup)

  it('renders the item and overdue totals', () => {
    render(<WorkReportPanel report={makeReport({ overdue: 3 })} />)

    const items = screen.getByText('Items').parentElement as HTMLElement
    expect(within(items).getByText('14')).toBeInTheDocument()

    const overdue = screen.getByText('Overdue').parentElement as HTMLElement
    expect(within(overdue).getByText('3')).toBeInTheDocument()
  })

  it('flags an overdue count', () => {
    render(<WorkReportPanel report={makeReport({ overdue: 3 })} />)

    const overdue = screen.getByText('Overdue').parentElement as HTMLElement
    expect(within(overdue).getByText('3')).toHaveClass('text-destructive')
  })

  it('leaves a zero overdue count unflagged', () => {
    render(<WorkReportPanel report={makeReport()} />)

    const overdue = screen.getByText('Overdue').parentElement as HTMLElement
    expect(within(overdue).getByText('0')).not.toHaveClass('text-destructive')
  })

  it('renders the state, type, and assignee breakdowns', () => {
    render(<WorkReportPanel report={makeReport()} />)

    expect(screen.getByText('By state')).toBeInTheDocument()
    expect(screen.getByText('By type')).toBeInTheDocument()
    expect(screen.getByText('By assignee')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('scales each bar against the largest count in its breakdown', () => {
    const { container } = render(<WorkReportPanel report={makeReport()} />)

    expect(container.querySelector('[data-count-bar="todo"]')).toHaveStyle({
      width: '100%',
    })
    expect(
      container.querySelector('[data-count-bar="in-progress"]')
    ).toHaveStyle({ width: '50%' })
    expect(container.querySelector('[data-count-bar="done"]')).toHaveStyle({
      width: '25%',
    })
  })

  it('renders a short empty message for a breakdown without rows', () => {
    render(<WorkReportPanel report={makeReport({ byAssignee: [] })} />)

    const section = screen
      .getByText('By assignee')
      .closest('section') as HTMLElement
    expect(within(section).getByText('No items')).toBeInTheDocument()
  })

  it('renders an empty state when nothing is reported', () => {
    render(
      <WorkReportPanel
        report={makeReport({
          total: 0,
          overdue: 0,
          byState: [],
          byType: [],
          byAssignee: [],
        })}
      />
    )

    expect(screen.getByText('No items in this period')).toBeInTheDocument()
    expect(screen.queryByText('By state')).not.toBeInTheDocument()
  })
})
