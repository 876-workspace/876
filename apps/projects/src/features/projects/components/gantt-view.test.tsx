import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Gantt } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { update: mocks.update },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import { GanttView } from './gantt-view'

const DAY = 86400

function gantt(): Gantt {
  return {
    object: 'gantt',
    rows: [
      {
        object: 'gantt-row',
        id: 'row-1',
        kind: 'work-item',
        parentRowId: null,
        issueId: 'iss_1',
        name: 'Interview customers',
        plannedStart: 1788307200,
        plannedFinish: 1788307200 + DAY * 4,
        actualStart: null,
        actualFinish: null,
        percentComplete: 0,
        isCritical: false,
      },
    ],
    edges: [],
    criticalIssueIds: [],
    range: { start: 1788307200, end: 1788307200 + DAY * 4 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({
    data: { object: 'projects.issue' },
    error: null,
  })
})

describe('GanttView', () => {
  it('persists a keyboard move through the issue update route', async () => {
    render(<GanttView gantt={gantt()} issuesBaseHref="/issues" canEdit />)

    fireEvent.keyDown(
      screen.getByRole('button', { name: /Interview customers/ }),
      {
        key: 'ArrowRight',
      }
    )

    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith('iss_1', {
      plannedStartDate: 1788307200 + DAY,
      plannedFinishDate: 1788307200 + DAY * 5,
    })
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
  })

  it('shows a banner and does not refresh when the write fails', async () => {
    mocks.update.mockResolvedValue({
      data: null,
      error: { code: 'error/not-found', message: 'That issue does not exist.' },
    })

    render(<GanttView gantt={gantt()} issuesBaseHref="/issues" canEdit />)

    fireEvent.keyDown(
      screen.getByRole('button', { name: /Interview customers/ }),
      {
        key: 'ArrowRight',
      }
    )

    expect(
      await screen.findByText('The new dates could not be saved')
    ).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('switches the presentation zoom without refetching', () => {
    const { container } = render(
      <GanttView gantt={gantt()} issuesBaseHref="/issues" canEdit />
    )
    const dayColumns = container.querySelectorAll('[data-gantt-column]').length

    fireEvent.click(screen.getByRole('button', { name: 'Month' }))

    expect(
      container.querySelectorAll('[data-gantt-column]').length
    ).toBeLessThan(dayColumns)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
