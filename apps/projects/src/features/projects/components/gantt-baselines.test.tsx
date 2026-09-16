import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Baseline, BaselineComparison } from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  baselinesClient: { create: mocks.create, delete: mocks.remove },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/projects/prj_1/gantt',
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}))

import { GanttBaselines, formatVarianceDays } from './gantt-baselines'

function baseline(overrides: Partial<Baseline> = {}): Baseline {
  return {
    object: 'projects.baseline',
    id: 'bsl_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    name: 'Kickoff plan',
    capturedBy: 'usr_1',
    capturedAt: 1788400000,
    note: null,
    itemCount: 2,
    ...overrides,
  }
}

function comparison(): BaselineComparison {
  return {
    object: 'baseline-comparison',
    baselineId: 'bsl_1',
    projectId: 'prj_1',
    items: [
      {
        object: 'baseline-comparison-item',
        issueId: 'iss_1',
        identifier: 'CONSOLE-1',
        baselineStart: 1788307200,
        baselineFinish: 1788307200,
        currentStart: 1788307200,
        currentFinish: 1788307200,
        startVarianceMinutes: -2880,
        finishVarianceMinutes: 1440,
      },
    ],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.create.mockResolvedValue({
    data: { object: 'projects.baseline', id: 'bsl_2' },
    error: null,
  })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.baseline', id: 'bsl_1', deleted: true },
    error: null,
  })
})

describe('GanttBaselines', () => {
  it('captures a baseline once and selects it', async () => {
    const user = userEvent.setup()
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[]}
        selectedBaselineId={null}
        comparison={null}
        canEdit
      />
    )

    await user.type(screen.getByLabelText('Baseline name'), 'Kickoff plan')
    await user.click(screen.getByRole('button', { name: 'Capture baseline' }))

    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith('prj_1', {
      name: 'Kickoff plan',
    })
    expect(mocks.replace).toHaveBeenCalledWith(
      '/projects/prj_1/gantt?baselineId=bsl_2'
    )
  })

  it('shows the failure banner when the capture is rejected and keeps the name', async () => {
    const user = userEvent.setup()
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'error/bad-request', message: 'Name required.' },
    })
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[]}
        selectedBaselineId={null}
        comparison={null}
        canEdit
      />
    )

    await user.type(screen.getByLabelText('Baseline name'), 'Kickoff plan')
    await user.click(screen.getByRole('button', { name: 'Capture baseline' }))

    expect(
      await screen.findByText('The baseline change was not saved')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Baseline name')).toHaveValue('Kickoff plan')
  })

  it('lists captured baselines with their size', () => {
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[baseline()]}
        selectedBaselineId="bsl_1"
        comparison={null}
        canEdit
      />
    )

    expect(screen.getByText('Kickoff plan')).toBeInTheDocument()
    expect(screen.getByText(/2 work items/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Compare Kickoff plan' })
    ).toHaveAttribute('href', '/projects/prj_1/gantt?baselineId=bsl_1')
  })

  it('renders the empty state when nothing has been captured', () => {
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[]}
        selectedBaselineId={null}
        comparison={null}
        canEdit
      />
    )

    expect(screen.getByText('No baselines captured yet.')).toBeInTheDocument()
  })

  it('renders the variance in days for each compared work item', () => {
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[baseline()]}
        selectedBaselineId="bsl_1"
        comparison={comparison()}
        canEdit
      />
    )

    expect(screen.getByText('CONSOLE-1')).toBeInTheDocument()
    expect(screen.getByText('-2 d')).toBeInTheDocument()
    expect(screen.getByText('+1 d')).toBeInTheDocument()
  })

  it('deletes a baseline through the route', async () => {
    const user = userEvent.setup()
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[baseline(), baseline({ id: 'bsl_2', name: 'Week 2' })]}
        selectedBaselineId="bsl_1"
        comparison={null}
        canEdit
      />
    )

    await user.click(screen.getByRole('button', { name: 'Delete Week 2' }))

    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledWith('prj_1', 'bsl_2')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('clears the selected baseline when the compared baseline is deleted', async () => {
    const user = userEvent.setup()
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[baseline()]}
        selectedBaselineId="bsl_1"
        comparison={null}
        canEdit
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Delete Kickoff plan' })
    )

    expect(mocks.replace).toHaveBeenCalledWith('/projects/prj_1/gantt')
  })

  it('offers no capture or delete action to a read-only viewer', () => {
    render(
      <GanttBaselines
        projectId="prj_1"
        baselines={[baseline()]}
        selectedBaselineId="bsl_1"
        comparison={comparison()}
        canEdit={false}
      />
    )

    expect(
      screen.queryByRole('button', { name: 'Capture baseline' })
    ).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Delete Kickoff plan' })
    ).toBeNull()
    expect(screen.getByText('-2 d')).toBeInTheDocument()
  })
})

describe('formatVarianceDays', () => {
  it('reports the sign of the day variance', () => {
    expect(formatVarianceDays(-2880)).toBe('-2 d')
    expect(formatVarianceDays(1440)).toBe('+1 d')
    expect(formatVarianceDays(0)).toBe('0 d')
    expect(formatVarianceDays(null)).toBe('—')
  })
})
